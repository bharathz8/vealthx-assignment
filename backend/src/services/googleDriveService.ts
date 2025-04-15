import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import vision from '@google-cloud/vision';
import * as documentProcessor from './documentProcessor.js';
import { Asset, IAsset } from '../models/assetSchema.js';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import dotenv from "dotenv";
import { Types } from 'mongoose';

dotenv.config();

const BUCKET_NAME = process.env.GOOGLE_BUCKET as string;

console.log("bucket name: ",BUCKET_NAME);

export interface ProcessFileResult {
  fileId: string;
  fileName: string | null | undefined;
  extractedData: Partial<IAsset> | null;
  documentType: string | undefined;
  isInStaticList: boolean;
  isFinancialDocument: boolean;
  saved?: boolean;
  existingAsset?: any;
}


// Configure Google Drive API
const authenticateGoogleDrive = (accessToken?: string) => {
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

const extractTextFromFile = async (filePath: string, mimeType: string): Promise<string> => {
  let extractedText = '';
  
  try {
    console.log(`Starting text extraction for file: ${filePath} with MIME type: ${mimeType}`);
    
    if (mimeType && mimeType.includes('image/')) {
      console.log('Processing as image with Vision API');
      // Process image using Vision API
      const [textDetection] = await visionClient.textDetection(filePath);
      
      // Add better error handling and logging
      if (!textDetection) {
        console.error('No text detection response from Vision API');
      } else if (!textDetection.fullTextAnnotation) {
        console.error('No fullTextAnnotation in Vision API response', JSON.stringify(textDetection, null, 2));
      }
      
      extractedText = textDetection?.fullTextAnnotation?.text || '';
      console.log(`Image text extraction complete. Got ${extractedText.length} characters`);
      
      // Add sample of extracted text if available
      if (extractedText.length > 0) {
        console.log(`First 100 chars: ${extractedText.substring(0, 100)}`);
      } else {
        console.log('No text was extracted from the image');
      }
    } else if (mimeType === 'application/pdf') {
      console.log('Processing as PDF - entered PDF code branch');
      
      // Check if file exists and is readable
      try {
        const stats = fs.statSync(filePath);
        console.log(`PDF file exists, size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          console.error('PDF file exists but has zero size');
          return '';
        }
      } catch (err) {
        console.error('Error checking PDF file:', err);
        return '';
      }
      
      const gcsFileName = `temp-${uuidv4()}.pdf`;
      console.log(`Uploading to GCS bucket ${BUCKET_NAME} as ${gcsFileName}`);
      
      // Check if bucket exists
      try {
        const [exists] = await storage.bucket(BUCKET_NAME).exists();
        if (!exists) {
          throw new Error(`Bucket ${BUCKET_NAME} does not exist`);
        }
        console.log(`Bucket ${BUCKET_NAME} exists and is accessible`);
      } catch (bucketError) {
        console.error('Error checking bucket:', bucketError);
        throw bucketError;
      }
      
      try {
        await storage.bucket(BUCKET_NAME).upload(filePath, {
          destination: gcsFileName,
        });
        console.log('Upload successful');
      } catch (uploadError) {
        console.error('Error uploading to GCS:', uploadError);
        throw uploadError;
      }

      try {
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

        console.log('Sending PDF to Vision API for async processing');
        const [operation] = await visionClient.asyncBatchAnnotateFiles(request as any);
        console.log('Waiting for Vision API processing to complete...');
        const [filesResponse] = await operation.promise();
        console.log('Vision API processing complete');
        
        // Extract text from PDF
        const textResponses = filesResponse.responses || [];
        if (textResponses.length > 0) {
          extractedText = textResponses
            .map((response: any) => response.fullTextAnnotation?.text || '')
            .join('\n');
          console.log(`PDF text extraction complete. Got ${extractedText.length} characters`);
          
          if (extractedText.length > 0) {
            console.log(`First 100 chars: ${extractedText.substring(0, 100)}`);
          } else {
            console.log('No text was extracted from the PDF');
          }
        } else {
          console.log('No text responses received from Vision API');
        }
      } catch (visionError) {
        console.error('Error processing PDF with Vision API:', visionError);
      }

      // Clean up GCS file regardless of success or failure
      try {
        console.log(`Cleaning up temporary GCS file: ${gcsFileName}`);
        await storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
      } catch (cleanupError) {
        console.error('Error cleaning up GCS file:', cleanupError);
      }
    } else {
      console.log(`Unsupported file type: ${mimeType}`);
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from file:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};
// Process a single document from Google Drive
export const processFile = async (fileId: string, accessToken?: string): Promise<ProcessFileResult> => {
  const drive = authenticateGoogleDrive(accessToken);
  const tempDir = path.resolve(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempFilePath = path.join(tempDir, `file-${fileId}`);
  let extractedText = '';
  let extractedData: Partial<IAsset> | null = null;
  let documentType: string = 'unknown';
  let isInStaticList = false;

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

    const dest = fs.createWriteStream(tempFilePath);
    const fileStream = response.data as unknown as Readable;
    
    await new Promise<void>((resolve, reject) => {
      fileStream
        .pipe(dest)
        .on('finish', () => resolve())
        .on('error', reject);
    });

    // Extract text from the file
    extractedText = await extractTextFromFile(tempFilePath, mimeType as string);
    
    // Now log the extracted text after it's been populated
    console.log('Extracted text sample (first 200 chars):', extractedText.substring(0, 200));
    
    // Process text to extract asset information
    if (extractedText) {
      documentType = documentProcessor.detectDocumentType(extractedText);
      console.log('Document type detected:', documentType);
      
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
      
      // Check if the extracted data is in the static list
      if (extractedData) {
        isInStaticList = documentProcessor.isAssetInStaticList(extractedData);
      }
    }

    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    return {
      fileId,
      fileName,
      extractedData,
      documentType: extractedData ? extractedData.type : 'unknown',
      isInStaticList,
      isFinancialDocument: !!extractedData
    };
  } catch (error: any) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    console.error('Error processing document:', error.message);
    throw error;
  }
};

// Main function to process all documents and save missing financial data
export const processDriveAndSaveMissingFinancialData = async (accessToken?: string) => {
  try {
    // 1. List all files from Google Drive
    const files = await listFiles(accessToken);
    if (!files || files.length === 0) {
      return { processedFiles: 0, missingDataFound: 0 };
    }
    
    console.log(`Found ${files.length} files in Google Drive to process`);
    
    // 2. Process each file to extract financial data
    const results = await Promise.all(
      files.map(file => processFile(file.id!, accessToken))
    );
    
    // 3. Filter for financial documents that are not in the static list
    const missingFinancialData = results
      .filter(result => result.isFinancialDocument && !result.isInStaticList)
      .map(result => {
        if (result.extractedData) {
          return {
            ...result.extractedData,
            fileName: result.fileName, // Add the original file name for reference
            fileId: result.fileId,     // Add the file ID for reference
            source: 'detected',
            createdAt: new Date()
          };
        }
        return null;
      })
      .filter(data => data !== null) as Partial<IAsset>[];
    
    console.log(`Found ${missingFinancialData.length} missing financial documents`);
    
    // 4. Save missing financial data to database
    if (missingFinancialData.length > 0) {
      const savedAssets = await Asset.insertMany(missingFinancialData);
      console.log(`Saved ${savedAssets.length} missing financial assets to database`);
    }
    
    return {
      processedFiles: files.length,
      missingDataFound: missingFinancialData.length,
      missingData: missingFinancialData
    };
  } catch (error: any) {
    console.error('Error processing drive and saving missing financial data:', error.message);
    throw error;
  }
};

// You can keep the existing findMissingAssets function if needed
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