import { Request, Response } from 'express';
import * as googleDriveService from '../services/googleDriveService';
import { Asset, IAsset } from '../models/assetSchema';

interface AuthRequest extends Request {
  userId?: string;
}

// List files from Google Drive
export const listFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("Fetching files from Google Drive...");
    const accessToken = req.header('X-Google-Token');
    if (!accessToken) {
      res.status(400).json({ message: 'Access token required' });
      return;
    }
    
    const files = await googleDriveService.listFiles(accessToken);
    res.status(200).json(files);
  } catch (error) {
    console.error("❌ Error listing files from Google Drive:", error);
    res.status(500).json({ message: 'Error listing files', error });
  }
};

// Process a single file
export const processFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const accessToken = req.header('X-Google-Token');
    
    if (!accessToken) {
      res.status(400).json({ message: 'Access token required' });
      return;
    }
    
    const result = await googleDriveService.processFile(fileId, accessToken);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error processing file', error });
  }
};

// Scan documents, extract data, and find missing assets
export const scanDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accessToken = req.header('X-Google-Token');
    const userId = req.userId;
    
    if (!accessToken) {
      res.status(400).json({ message: 'Access token required' });
      return;
    }
    
    if (!userId) {
      res.status(401).json({ message: 'User authentication required' });
      return;
    }
    
    console.log(`Starting document scan for user: ${userId}`);
    
    // Verify token validity before proceeding
    try {
      // Test if we can access Google Drive with this token
      await googleDriveService.listFiles(accessToken);
    } catch (tokenError) {
      console.error("Token validation error:", tokenError);
      res.status(401).json({ 
        message: 'Invalid or expired Google token',
        error: tokenError instanceof Error ? tokenError.message : String(tokenError)
      });
      return;
    }
    
    // If token is valid, proceed with the document scan
    let files = [];
    try {
      files = await googleDriveService.listFiles(accessToken) || [];
      console.log(`Found ${files.length} files to process`);
    } catch (listError) {
      console.error("Error listing files:", listError);
      res.status(500).json({ 
        message: 'Error listing files from Google Drive',
        error: listError instanceof Error ? listError.message : String(listError)
      });
      return;
    }
    
    // Process files and extract assets
    const extractedAssets: Partial<IAsset>[] = [];
    const processingErrors: Array<{fileId: string, error: string}> = [];
    
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (ID: ${file.id})`);
        const { extractedData } = await googleDriveService.processFile(file.id!, accessToken);
        if (extractedData && 'name' in extractedData && extractedData.name) {
          extractedAssets.push(extractedData as Partial<IAsset>);
        }
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
        processingErrors.push({
          fileId: file.id!,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue processing other files
      }
    }
    
    // Save detected assets to database
    const savedDetectedAssets = [];
    const saveErrors: Array<{asset: string, error: string}> = [];
    
    for (const asset of extractedAssets) {
      try {
        if (!asset.name || !asset.type) {
          console.warn(`Skipping asset with missing required fields: ${JSON.stringify(asset)}`);
          continue;
        }
        
        const existingAsset = await Asset.findOne({
          name: asset.name,
          type: asset.type,
          userId: userId,
          source: 'detected'
        });
        
        if (!existingAsset) {
          const newAsset = new Asset({
            ...asset,
            userId: userId,
            source: 'detected'
          });
          const savedAsset = await newAsset.save();
          savedDetectedAssets.push(savedAsset);
        }
      } catch (saveError) {
        console.error(`Error saving asset ${asset.name}:`, saveError);
        saveErrors.push({
          asset: asset.name || 'unknown',
          error: saveError instanceof Error ? saveError.message : String(saveError)
        });
        // Continue saving other assets
      }
    }
    
    // Find missing assets
    let missingAssets;
    try {
      missingAssets = await googleDriveService.findMissingAssets(extractedAssets, userId);
    } catch (missingError) {
      console.error("Error finding missing assets:", missingError);
      missingAssets = { missing_bank_accounts: [], missing_insurances: [] };
    }
    
    // Send response with detailed information
    res.status(200).json({
      scannedFiles: files.length,
      extractedAssets: extractedAssets.length,
      detectedAssets: savedDetectedAssets.length,
      missingAssets,
      errors: {
        processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
        saveErrors: saveErrors.length > 0 ? saveErrors : undefined
      }
    });
  } catch (error) {
    console.error("Error scanning documents:", error);
    res.status(500).json({ 
      message: 'Error scanning documents', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};