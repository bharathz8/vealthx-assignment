import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import vision from '@google-cloud/vision';
import * as documentProcessor from './documentProcessor';
import { Asset, IAsset } from '../models/assetSchema';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'vealthx-ocr-bucket';

// Configure Google Drive API
const authenticateGoogleDrive = (accessToken?: string) => {
  // If an access token is provided (from OAuth flow), use it
  if (accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth });
  }
  
  // Otherwise, fall back to service account
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
};

// Vision API client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.resolve(process.cwd(), 'credentials.json')
});

// GCS client
const storage = new Storage({
  keyFilename: path.resolve(process.cwd(), 'credentials.json')
});

// List files from Google Drive
export const listFiles = async (accessToken?: string) => {
  const drive = authenticateGoogleDrive(accessToken);

  try {
    const response = await drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType)',
      q: "mimeType='application/pdf' or mimeType contains 'image/'",
    });

    return response.data.files;
  } catch (error) {
    console.error('Error listing files from Drive:', error);
    throw error;
  }
};

// Download and process a file from Google Drive
export const processFile = async (fileId: string, accessToken?: string) => {
  const drive = authenticateGoogleDrive(accessToken);
  const tempDir = path.resolve(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempFilePath = path.join(tempDir, `file-${fileId}`);
  let extractedText = '';
  let extractedData: Partial<IAsset> | null = null;

  try {
    // Get file metadata
    const fileMetadata = await drive.files.get({ fileId, fields: 'mimeType,name' });
    const mimeType = fileMetadata.data.mimeType;
    const fileName = fileMetadata.data.name;
    
    console.log(`Processing file "${fileName}" (ID: ${fileId}), MIME type: ${mimeType}`);

    // Download the file
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Save the file to a temporary location
    const dest = fs.createWriteStream(tempFilePath);
    const fileStream = response.data as unknown as Readable;
    
    await new Promise<void>((resolve, reject) => {
      fileStream
        .pipe(dest)
        .on('finish', () => resolve())
        .on('error', reject);
    });

    // Process based on MIME type
    if (mimeType && mimeType.includes('image/')) {
      // Process image using Vision API
      const [textDetection] = await visionClient.textDetection(tempFilePath);
      extractedText = textDetection.fullTextAnnotation?.text || '';
    } else if (mimeType === 'application/pdf') {
      // Upload to GCS for Vision API processing
      const gcsFileName = `temp-${uuidv4()}.pdf`;
      await storage.bucket(BUCKET_NAME).upload(tempFilePath, {
        destination: gcsFileName,
      });

      // Process PDF with Vision API
      // Fix for the vision API request
      const inputConfig = {
        gcsSource: {
          uri: `gs://${BUCKET_NAME}/${gcsFileName}`,
        },
        mimeType: 'application/pdf',
      };
      
      const features = [{ type: 'DOCUMENT_TEXT_DETECTION' }];
      const outputConfig = {
        gcsDestination: {
          uri: `gs://${BUCKET_NAME}/output-${uuidv4()}/`,
        },
      };
      
      const request = {
        requests: [
          {
            inputConfig,
            features,
            outputConfig,
          },
        ],
      };

      // Using the correct method signature
      const [operation] = await visionClient.asyncBatchAnnotateFiles(request as any);
      const [filesResponse] = await operation.promise();
      
      // Extract text from PDF
      const textResponses = filesResponse.responses || [];
      if (textResponses.length > 0) {
        extractedText = textResponses
          .map((response: any) => response.fullTextAnnotation?.text || '')
          .join('\n');
      }

      // Clean up GCS file
      await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
    } else {
      console.log(`Unsupported file type: ${mimeType}`);
    }

    // Process text to extract asset information
    if (extractedText) {
      const documentType = documentProcessor.detectDocumentType(extractedText);
      
      switch (documentType) {
        case 'bank_statement':
          extractedData = documentProcessor.extractBankStatementData(extractedText);
          break;
        case 'insurance_policy':
          extractedData = documentProcessor.extractInsuranceData(extractedText);
          break;
        case 'vehicle_policy':
          extractedData = documentProcessor.extractVehicleData(extractedText);
          break;
        case 'unknown':
        default:
          console.log(`Unknown document type for file ${fileId}`);
          break;
      }
    }

    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    return {
      fileId,
      extractedText,
      extractedData,
      documentType: extractedData ? extractedData.type : 'unknown'
    };
  } catch (error: any) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    console.error('Error processing file:', error.message);
    throw error;
  }
};

// Compare extracted assets with static list to find missing items
export const findMissingAssets = async (extractedAssets: Partial<IAsset>[], userId?: string) => {
  try {
    // If userId is provided, use it to filter static assets
    const query = userId ? { source: 'static', userId } : { source: 'static' };
    const staticAssets = await Asset.find(query);

    const staticBankNames = staticAssets
      .filter(asset => asset.type === 'bank_account')
      .map(asset => asset.name.toLowerCase());

    const staticInsuranceNames = staticAssets
      .filter(asset => asset.type === 'insurance')
      .map(asset => asset.name.toLowerCase());

    const missingBankAccounts = extractedAssets
      .filter(asset =>
        asset.type === 'bank_account' &&
        asset.name &&
        !staticBankNames.includes(asset.name.toLowerCase())
      );

    const missingInsurances = extractedAssets
      .filter(asset =>
        (asset.type === 'insurance' || asset.type === 'vehicle') &&
        asset.name &&
        !staticInsuranceNames.includes(asset.name.toLowerCase())
      );

    return {
      missing_bank_accounts: missingBankAccounts,
      missing_insurances: missingInsurances
    };
  } catch (error) {
    console.error('Error finding missing assets:', error);
    throw error;
  }
};