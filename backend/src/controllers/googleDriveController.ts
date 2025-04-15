import { Request, Response } from 'express';
import * as googleDriveService from '../services/googleDriveService.js';
import { Asset, IAsset } from '../models/assetSchema.js';
import { User } from '../models/userSchema.js';
import { oauth2Client } from '../config/google.js';
import { ProcessFileResult } from '../services/googleDriveService.js';

interface AuthRequest extends Request {
  userId?: string;
}

// Helper function to get a valid access token
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If access token exists and not expired, use it
    if (user.accessToken && user.tokenExpiry && new Date(user.tokenExpiry) > new Date()) {
      return user.accessToken;
    }

    // If refresh token exists, use it to get a new access token
    if (user.refreshToken) {
      oauth2Client.setCredentials({
        refresh_token: user.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update user with new tokens
      user.accessToken = credentials.access_token || undefined;
      user.tokenExpiry = credentials.expiry_date 
        ? new Date(credentials.expiry_date) 
        : new Date(Date.now() + (3600 * 1000));
      await user.save();
      
      return credentials.access_token || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

// Enhanced error handling for Google Drive API calls
const handleGoogleDriveError = (error: any, res: Response): void => {
  console.error("Google Drive API Error:", error);
  
  // Check for common OAuth/API errors
  if (error.response && error.response.status) {
    switch (error.response.status) {
      case 401:
        res.status(401).json({ 
          message: 'Google Drive authentication error - token expired or invalid',
          error: error.message
        });
        return;
      case 403:
        res.status(403).json({ 
          message: 'Access denied to Google Drive. Check permissions.',
          error: error.message
        });
        return;
      case 404:
        res.status(404).json({ 
          message: 'Resource not found on Google Drive',
          error: error.message
        });
        return;
      case 429:
        res.status(429).json({ 
          message: 'Google API rate limit exceeded. Try again later.',
          error: error.message
        });
        return;
    }
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Error processing Google Drive request', 
    error: error instanceof Error ? error.message : String(error)
  });
}

// List files from Google Drive
export const listFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("Fetching files from Google Drive...");
    
    // First try to get token from header (for backward compatibility)
    let accessToken = req.header('X-Google-Token');
    
    // If no token in header, try to get from database
    if (!accessToken && req.userId) {
      accessToken = await getValidAccessToken(req.userId) || undefined;
    }
    
    if (!accessToken) {
      res.status(401).json({ message: 'Valid Google access token required' });
      return;
    }
    
    const files = await googleDriveService.listFiles(accessToken);
    res.status(200).json({ 
      count: files?.length || 0,
      files 
    });
  } catch (error) {
    handleGoogleDriveError(error, res);
  }
};

// Process a single file with better error reporting
export const processFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      res.status(400).json({ message: 'File ID is required' });
      return;
    }
    
    // First try to get token from header (for backward compatibility)
    let accessToken = req.header('X-Google-Token');
    
    // If no token in header, try to get from database
    if (!accessToken && req.userId) {
      accessToken = await getValidAccessToken(req.userId) || undefined;
    }
    
    if (!accessToken) {
      res.status(401).json({ message: 'Valid Google access token required' });
      return;
    }
    
    const result = await googleDriveService.processFile(fileId, accessToken);
    
    // If the user is authenticated, save the extracted data if it's a financial document
    if (req.userId && result.isFinancialDocument && result.extractedData) {
      const existingAsset = await Asset.findOne({
        name: result.extractedData.name,
        type: result.extractedData.type,
        userId: req.userId,
        source: 'detected'
      });
      
      if (!existingAsset && result.extractedData.name && result.extractedData.type) {
        const newAsset = new Asset({
          ...result.extractedData,
          userId: req.userId,
          fileId: result.fileId,
          fileName: result.fileName,
          source: 'detected',
          createdAt: new Date()
        });
        
        await newAsset.save();
        result.saved = true;
      } else {
        result.saved = false;
        result.existingAsset = existingAsset || undefined;
      }
    }
    
    res.status(200).json(result);
  } catch (error) {
    handleGoogleDriveError(error, res);
  }
};

// Enhanced scan documents with progress tracking and better error management
export const scanDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // First try to get token from header (for backward compatibility)
    let accessToken = req.header('X-Google-Token');
    const userId = req.userId;
    
    // If no token in header, try to get from database
    if (!accessToken && userId) {
      accessToken = await getValidAccessToken(userId) || undefined;
    }
    
    if (!accessToken) {
      res.status(401).json({ message: 'Valid Google access token required' });
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
    
    // List files from Drive
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
    
    // Send initial response to indicate processing has started
    res.status(202).json({
      message: 'Document scanning started',
      filesFound: files.length,
      status: 'processing'
    });
    
    // Continue processing in the background
    void (async () => {
      const extractedAssets: Partial<IAsset>[] = [];
      const processingErrors: Array<{fileId: string, fileName: string, error: string}> = [];
      const savedAssets: IAsset[] = [];
      
      for (const file of files) {
        try {
          console.log(`Processing file: ${file.name} (ID: ${file.id})`);
          const { extractedData, isFinancialDocument } = await googleDriveService.processFile(file.id!, accessToken);
          
          if (isFinancialDocument && extractedData && 'name' in extractedData && extractedData.name) {
            extractedAssets.push(extractedData as Partial<IAsset>);
            
            // Save to database if not already exists
            const existingAsset = await Asset.findOne({
              name: extractedData.name,
              type: extractedData.type,
              userId: userId,
              source: 'detected'
            });
            
            if (!existingAsset) {
              const newAsset = new Asset({
                ...extractedData,
                userId: userId,
                fileId: file.id,
                fileName: file.name,
                source: 'detected',
                createdAt: new Date()
              });
              
              const savedAsset = await newAsset.save();
              savedAssets.push(savedAsset);
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.id} (${file.name}):`, error);
          processingErrors.push({
            fileId: file.id!,
            fileName: file.name || 'Unknown',
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue processing other files
        }
      }
      
      // Use the service to find missing assets
      let missingAssets;
      try {
        missingAssets = await googleDriveService.findMissingAssets(extractedAssets, userId);
      } catch (missingError) {
        console.error("Error finding missing assets:", missingError);
        missingAssets = { missing_bank_accounts: [], missing_insurances: [] };
      }
      
      // Save completion status somewhere (e.g., in user document)
      try {
        const user = await User.findById(userId);
        if (user) {
          user.lastScanCompleted = new Date();
          user.lastScanResults = {
            scannedFiles: files.length,
            extractedAssets: extractedAssets.length,
            savedAssets: savedAssets.length,
            errors: processingErrors.length,
            missingAssetsFound: 
              (missingAssets.missing_bank_accounts?.length || 0) + 
              (missingAssets.missing_insurances?.length || 0)
          };
          await user.save();
        }
      } catch (updateError) {
        console.error("Error updating user scan status:", updateError);
        // Non-critical error, continue
      }
      
      console.log(`Scan completed for user ${userId}. Found ${extractedAssets.length} financial assets, saved ${savedAssets.length} new assets`);
    })().catch(error => {
      console.error("Background processing error:", error);
    });
  } catch (error) {
    console.error("Error initiating document scan:", error);
    res.status(500).json({ 
      message: 'Error initiating document scan', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Get scan status for a user
export const getScanStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'User authentication required' });
      return;
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    if (!user.lastScanCompleted) {
      res.status(200).json({
        status: 'never_run',
        message: 'No document scan has been completed yet'
      });
      return;
    }
    
    // Return scan status
    res.status(200).json({
      status: 'completed',
      lastScanCompleted: user.lastScanCompleted,
      results: user.lastScanResults || {
        scannedFiles: 0,
        extractedAssets: 0,
        savedAssets: 0,
        errors: 0,
        missingAssetsFound: 0
      }
    });
  } catch (error) {
    console.error("Error getting scan status:", error);
    res.status(500).json({ 
      message: 'Error retrieving scan status', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};