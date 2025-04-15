var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Asset } from '../models/assetSchema.js';
import * as documentProcessor from '../services/documentProcessor.js';
// Get all assets for current user
export const getAllAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield Asset.find({ userId: req.userId });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching assets', error });
    }
});
// Get static assets for current user
export const getStaticAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield Asset.find({ userId: req.userId, source: 'static' });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching static assets', error });
    }
});
// Get detected assets for current user
export const getDetectedAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield Asset.find({ userId: req.userId, source: 'detected' });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching detected assets', error });
    }
});
// Get missing assets - enhanced to use documentProcessor's logic
export const getMissingAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get all static assets for this user
        const staticAssets = yield Asset.find({ userId, source: 'static' });
        // Get all detected assets for this user
        const detectedAssets = yield Asset.find({ userId, source: 'detected' });
        // Convert to the format expected by findMissingAssets
        const extractedAssets = detectedAssets.map(asset => ({
            name: asset.name,
            type: asset.type,
            accountNumber: asset.accountNumber,
            policyNumber: asset.policyNumber,
            balanceAmount: asset.balanceAmount,
            insuredAmount: asset.insuredAmount,
            renewalDate: asset.renewalDate,
            source: asset.source
        }));
        // Use the service function to check missing assets
        const missingAssets = (yield documentProcessor.isAssetInStaticList) ?
            // Filter assets that are not in static list
            extractedAssets.filter(asset => !documentProcessor.isAssetInStaticList(asset)) :
            // Fallback to direct comparison if isAssetInStaticList isn't available
            extractedAssets.filter(detectedAsset => {
                return !staticAssets.some(staticAsset => {
                    var _a;
                    return staticAsset.name.toLowerCase() === ((_a = detectedAsset.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) &&
                        staticAsset.type === detectedAsset.type;
                });
            });
        res.status(200).json(missingAssets);
    }
    catch (error) {
        console.error('Error finding missing assets:', error);
        res.status(500).json({
            message: 'Error finding missing assets',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Add missing asset with enhanced validation
export const addMissingAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate that required fields exist
        if (!req.body.name || !req.body.type) {
            res.status(400).json({ message: 'Missing required fields: name and type are required' });
            return;
        }
        // Check if this asset is already in the static list
        const isInStatic = yield Asset.findOne({
            userId: req.userId,
            source: 'static',
            name: req.body.name,
            type: req.body.type
        });
        if (isInStatic) {
            res.status(409).json({
                message: 'Asset already exists in your static assets',
                asset: isInStatic
            });
            return;
        }
        // Check if already exists as detected
        const existingDetected = yield Asset.findOne({
            userId: req.userId,
            source: 'detected',
            name: req.body.name,
            type: req.body.type
        });
        if (existingDetected) {
            res.status(200).json({
                message: 'Asset already exists in your detected assets',
                asset: existingDetected
            });
            return;
        }
        const newAsset = new Asset(Object.assign(Object.assign({}, req.body), { userId: req.userId, source: 'detected', createdAt: new Date() }));
        const savedAsset = yield newAsset.save();
        res.status(201).json(savedAsset);
    }
    catch (error) {
        console.error('Error adding asset:', error);
        res.status(500).json({
            message: 'Error adding asset',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Initialize static assets with better error handling and reporting
export const initializeStaticAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }
        // First clear existing static assets for this user
        const deleteResult = yield Asset.deleteMany({ userId: req.userId, source: 'static' });
        // Define static assets - using the staticList data if possible
        let staticAssets = [];
        try {
            const staticList = require('../config/staticList.json');
            // Convert bank accounts from static list
            staticAssets = [
                ...staticList.bank_accounts.map((name) => ({
                    name,
                    type: 'bank_account',
                    source: 'static',
                    userId: req.userId
                })),
                ...staticList.insurances.map((name) => ({
                    name,
                    type: 'insurance',
                    source: 'static',
                    userId: req.userId
                }))
            ];
        }
        catch (error) {
            // Fallback to hardcoded list if config file not available
            staticAssets = [
                { name: 'HDFC Current', type: 'bank_account', source: 'static', userId: req.userId },
                { name: 'ICICI Current', type: 'bank_account', source: 'static', userId: req.userId },
                { name: 'kotak life Term Plan', type: 'insurance', source: 'static', userId: req.userId },
                { name: 'Star Health Policy', type: 'insurance', source: 'static', userId: req.userId }
            ];
        }
        // Insert static assets
        const result = yield Asset.insertMany(staticAssets);
        res.status(201).json({
            message: 'Static assets initialized',
            deleted: deleteResult.deletedCount,
            added: result.length,
            assets: result
        });
    }
    catch (error) {
        console.error('Error initializing static assets:', error);
        res.status(500).json({
            message: 'Error initializing static assets',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Add new endpoint to convert detected asset to static
export const convertToStatic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assetId } = req.params;
        // Find the detected asset
        const detectedAsset = yield Asset.findOne({
            _id: assetId,
            userId: req.userId,
            source: 'detected'
        });
        if (!detectedAsset) {
            res.status(404).json({ message: 'Detected asset not found' });
            return;
        }
        // Check if already exists in static
        const existingStatic = yield Asset.findOne({
            name: detectedAsset.name,
            type: detectedAsset.type,
            userId: req.userId,
            source: 'static'
        });
        if (existingStatic) {
            res.status(409).json({
                message: 'Asset already exists in static assets',
                asset: existingStatic
            });
            return;
        }
        // Create new static asset
        const staticAsset = new Asset({
            name: detectedAsset.name,
            type: detectedAsset.type,
            accountNumber: detectedAsset.accountNumber,
            policyNumber: detectedAsset.policyNumber,
            balanceAmount: detectedAsset.balanceAmount,
            insuredAmount: detectedAsset.insuredAmount,
            renewalDate: detectedAsset.renewalDate,
            userId: req.userId,
            source: 'static'
        });
        const savedStatic = yield staticAsset.save();
        // Optionally, delete the detected asset
        yield Asset.findByIdAndDelete(assetId);
        res.status(200).json({
            message: 'Asset converted to static successfully',
            asset: savedStatic
        });
    }
    catch (error) {
        console.error('Error converting asset to static:', error);
        res.status(500).json({
            message: 'Error converting asset',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
