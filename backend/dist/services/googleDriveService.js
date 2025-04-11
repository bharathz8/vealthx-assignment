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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMissingAssets = exports.processFile = exports.listFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const googleapis_1 = require("googleapis");
const vision_1 = __importDefault(require("@google-cloud/vision"));
const documentProcessor = __importStar(require("./documentProcessor"));
const assetSchema_1 = require("../models/assetSchema");
const storage_1 = require("@google-cloud/storage");
const uuid_1 = require("uuid");
const BUCKET_NAME = 'vealthx-ocr-bucket';
// Configure Google Drive API
const authenticateGoogleDrive = (accessToken) => {
    // If an access token is provided (from OAuth flow), use it
    if (accessToken) {
        const auth = new googleapis_1.google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        return googleapis_1.google.drive({ version: 'v3', auth });
    }
    // Otherwise, fall back to service account
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: path_1.default.resolve(process.cwd(), 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return googleapis_1.google.drive({ version: 'v3', auth });
};
// Vision API client
const visionClient = new vision_1.default.ImageAnnotatorClient({
    keyFilename: path_1.default.resolve(process.cwd(), 'credentials.json')
});
// GCS client
const storage = new storage_1.Storage({
    keyFilename: path_1.default.resolve(process.cwd(), 'credentials.json')
});
// List files from Google Drive
const listFiles = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    const drive = authenticateGoogleDrive(accessToken);
    try {
        const response = yield drive.files.list({
            pageSize: 50,
            fields: 'files(id, name, mimeType)',
            q: "mimeType='application/pdf' or mimeType contains 'image/'",
        });
        return response.data.files;
    }
    catch (error) {
        console.error('Error listing files from Drive:', error);
        throw error;
    }
});
exports.listFiles = listFiles;
// Download and process a file from Google Drive
const processFile = (fileId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const drive = authenticateGoogleDrive(accessToken);
    const tempDir = path_1.default.resolve(process.cwd(), 'temp');
    if (!fs_1.default.existsSync(tempDir))
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    const tempFilePath = path_1.default.join(tempDir, `file-${fileId}`);
    let extractedText = '';
    let extractedData = null;
    try {
        // Get file metadata
        const fileMetadata = yield drive.files.get({ fileId, fields: 'mimeType,name' });
        const mimeType = fileMetadata.data.mimeType;
        const fileName = fileMetadata.data.name;
        console.log(`Processing file "${fileName}" (ID: ${fileId}), MIME type: ${mimeType}`);
        // Download the file
        const response = yield drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        // Save the file to a temporary location
        const dest = fs_1.default.createWriteStream(tempFilePath);
        const fileStream = response.data;
        yield new Promise((resolve, reject) => {
            fileStream
                .pipe(dest)
                .on('finish', () => resolve())
                .on('error', reject);
        });
        // Process based on MIME type
        if (mimeType && mimeType.includes('image/')) {
            // Process image using Vision API
            const [textDetection] = yield visionClient.textDetection(tempFilePath);
            extractedText = ((_a = textDetection.fullTextAnnotation) === null || _a === void 0 ? void 0 : _a.text) || '';
        }
        else if (mimeType === 'application/pdf') {
            // Upload to GCS for Vision API processing
            const gcsFileName = `temp-${(0, uuid_1.v4)()}.pdf`;
            yield storage.bucket(BUCKET_NAME).upload(tempFilePath, {
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
                    uri: `gs://${BUCKET_NAME}/output-${(0, uuid_1.v4)()}/`,
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
            const [operation] = yield visionClient.asyncBatchAnnotateFiles(request);
            const [filesResponse] = yield operation.promise();
            // Extract text from PDF
            const textResponses = filesResponse.responses || [];
            if (textResponses.length > 0) {
                extractedText = textResponses
                    .map((response) => { var _a; return ((_a = response.fullTextAnnotation) === null || _a === void 0 ? void 0 : _a.text) || ''; })
                    .join('\n');
            }
            // Clean up GCS file
            yield storage.bucket(BUCKET_NAME).file(gcsFileName).delete();
        }
        else {
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
        if (fs_1.default.existsSync(tempFilePath))
            fs_1.default.unlinkSync(tempFilePath);
        return {
            fileId,
            extractedText,
            extractedData,
            documentType: extractedData ? extractedData.type : 'unknown'
        };
    }
    catch (error) {
        if (fs_1.default.existsSync(tempFilePath))
            fs_1.default.unlinkSync(tempFilePath);
        console.error('Error processing file:', error.message);
        throw error;
    }
});
exports.processFile = processFile;
// Compare extracted assets with static list to find missing items
const findMissingAssets = (extractedAssets, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // If userId is provided, use it to filter static assets
        const query = userId ? { source: 'static', userId } : { source: 'static' };
        const staticAssets = yield assetSchema_1.Asset.find(query);
        const staticBankNames = staticAssets
            .filter(asset => asset.type === 'bank_account')
            .map(asset => asset.name.toLowerCase());
        const staticInsuranceNames = staticAssets
            .filter(asset => asset.type === 'insurance')
            .map(asset => asset.name.toLowerCase());
        const missingBankAccounts = extractedAssets
            .filter(asset => asset.type === 'bank_account' &&
            asset.name &&
            !staticBankNames.includes(asset.name.toLowerCase()));
        const missingInsurances = extractedAssets
            .filter(asset => (asset.type === 'insurance' || asset.type === 'vehicle') &&
            asset.name &&
            !staticInsuranceNames.includes(asset.name.toLowerCase()));
        return {
            missing_bank_accounts: missingBankAccounts,
            missing_insurances: missingInsurances
        };
    }
    catch (error) {
        console.error('Error finding missing assets:', error);
        throw error;
    }
});
exports.findMissingAssets = findMissingAssets;
