"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDocuments = exports.processFile = exports.listFiles = void 0;
const googleDriveService = __importStar(require("../services/googleDriveService"));
const assetSchema_1 = require("../models/assetSchema");
// List files from Google Drive
const listFiles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Fetching files from Google Drive...");
        const accessToken = req.header('X-Google-Token');
        if (!accessToken) {
            res.status(400).json({ message: 'Access token required' });
            return;
        }
        const files = yield googleDriveService.listFiles(accessToken);
        res.status(200).json(files);
    }
    catch (error) {
        console.error("❌ Error listing files from Google Drive:", error);
        res.status(500).json({ message: 'Error listing files', error });
    }
});
exports.listFiles = listFiles;
// Process a single file
const processFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fileId } = req.params;
        const accessToken = req.header('X-Google-Token');
        if (!accessToken) {
            res.status(400).json({ message: 'Access token required' });
            return;
        }
        const result = yield googleDriveService.processFile(fileId, accessToken);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Error processing file', error });
    }
});
exports.processFile = processFile;
// Scan documents, extract data, and find missing assets
const scanDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            yield googleDriveService.listFiles(accessToken);
        }
        catch (tokenError) {
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
            files = (yield googleDriveService.listFiles(accessToken)) || [];
            console.log(`Found ${files.length} files to process`);
        }
        catch (listError) {
            console.error("Error listing files:", listError);
            res.status(500).json({
                message: 'Error listing files from Google Drive',
                error: listError instanceof Error ? listError.message : String(listError)
            });
            return;
        }
        // Process files and extract assets
        const extractedAssets = [];
        const processingErrors = [];
        for (const file of files) {
            try {
                console.log(`Processing file: ${file.name} (ID: ${file.id})`);
                const { extractedData } = yield googleDriveService.processFile(file.id, accessToken);
                if (extractedData && 'name' in extractedData && extractedData.name) {
                    extractedAssets.push(extractedData);
                }
            }
            catch (error) {
                console.error(`Error processing file ${file.id}:`, error);
                processingErrors.push({
                    fileId: file.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                // Continue processing other files
            }
        }
        // Save detected assets to database
        const savedDetectedAssets = [];
        const saveErrors = [];
        for (const asset of extractedAssets) {
            try {
                if (!asset.name || !asset.type) {
                    console.warn(`Skipping asset with missing required fields: ${JSON.stringify(asset)}`);
                    continue;
                }
                const existingAsset = yield assetSchema_1.Asset.findOne({
                    name: asset.name,
                    type: asset.type,
                    userId: userId,
                    source: 'detected'
                });
                if (!existingAsset) {
                    const newAsset = new assetSchema_1.Asset(Object.assign(Object.assign({}, asset), { userId: userId, source: 'detected' }));
                    const savedAsset = yield newAsset.save();
                    savedDetectedAssets.push(savedAsset);
                }
            }
            catch (saveError) {
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
            missingAssets = yield googleDriveService.findMissingAssets(extractedAssets, userId);
        }
        catch (missingError) {
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
    }
    catch (error) {
        console.error("Error scanning documents:", error);
        res.status(500).json({
            message: 'Error scanning documents',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.scanDocuments = scanDocuments;
