"use strict";
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
exports.initializeStaticAssets = exports.addMissingAsset = exports.getDetectedAssets = exports.getStaticAssets = exports.getAllAssets = void 0;
const assetSchema_1 = require("../models/assetSchema");
// Get all assets for current user
const getAllAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield assetSchema_1.Asset.find({ userId: req.userId });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching assets', error });
    }
});
exports.getAllAssets = getAllAssets;
// Get static assets for current user
const getStaticAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield assetSchema_1.Asset.find({ userId: req.userId, source: 'static' });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching static assets', error });
    }
});
exports.getStaticAssets = getStaticAssets;
// Get detected assets for current user
const getDetectedAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield assetSchema_1.Asset.find({ userId: req.userId, source: 'detected' });
        res.status(200).json(assets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching detected assets', error });
    }
});
exports.getDetectedAssets = getDetectedAssets;
// Add missing asset
const addMissingAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate that required fields exist
        if (!req.body.name || !req.body.type) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const newAsset = new assetSchema_1.Asset(Object.assign(Object.assign({}, req.body), { userId: req.userId, source: 'detected' }));
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
exports.addMissingAsset = addMissingAsset;
// Initialize static assets from predefined list for current user
const initializeStaticAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First clear existing static assets for this user
        yield assetSchema_1.Asset.deleteMany({ userId: req.userId, source: 'static' });
        // Define static assets
        const staticAssets = [
            { name: 'HDFC Savings', type: 'bank_account', source: 'static', userId: req.userId },
            { name: 'ICICI Current', type: 'bank_account', source: 'static', userId: req.userId },
            { name: 'LIC Term Plan', type: 'insurance', source: 'static', userId: req.userId },
            { name: 'Star Health Policy', type: 'insurance', source: 'static', userId: req.userId }
        ];
        // Insert static assets
        const result = yield assetSchema_1.Asset.insertMany(staticAssets);
        res.status(201).json({ message: 'Static assets initialized', assets: result });
    }
    catch (error) {
        res.status(500).json({ message: 'Error initializing static assets', error });
    }
});
exports.initializeStaticAssets = initializeStaticAssets;
