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
exports.googleAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userSchema_1 = require("../models/userSchema");
const dotenv_1 = __importDefault(require("dotenv"));
const google_auth_library_1 = require("google-auth-library");
const googleDriveService = __importStar(require("../services/googleDriveService"));
const assetSchema_1 = require("../models/assetSchema");
dotenv_1.default.config();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Process Google OAuth token and authenticate
const googleAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, accessToken } = req.body;
        if (!token) {
            res.status(400).json({ msg: "No token provided" });
            return;
        }
        console.log(token);
        // Verify Google token
        const ticket = yield googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub) {
            res.status(400).json({ msg: 'Invalid token payload' });
            return;
        }
        const { sub: googleId, email, name, picture } = payload;
        // Find or create user
        let user = yield userSchema_1.User.findOne({ googleId });
        if (!user) {
            // Check if a user with this email already exists
            user = yield userSchema_1.User.findOne({ email });
            if (user) {
                // Update existing user with Google ID
                user.googleId = googleId;
                user.picture = picture;
                yield user.save();
            }
            else {
                // Create new user with Google data
                user = yield userSchema_1.User.create({
                    googleId,
                    email,
                    name,
                    picture
                });
            }
        }
        const userId = user._id.toString();
        // Generate JWT token
        const jwtToken = jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET, {
            expiresIn: "24h"
        });
        // Initiate asset scanning in background (don't wait for completion)
        if (accessToken) {
            void scanUserAssets(userId, accessToken)
                .catch(error => console.error("Error scanning assets:", error));
        }
        else {
            console.log("No access token provided for scanning assets");
        }
        res.status(200).json({
            token: jwtToken,
            user: {
                id: userId,
                name: user.name,
                email: user.email,
                picture: user.picture
            }
        });
    }
    catch (error) {
        console.error("Google authentication error:", error);
        res.status(500).json({ msg: "Error authenticating with Google" });
    }
});
exports.googleAuth = googleAuth;
const scanUserAssets = (userId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`Starting automatic asset scan for user ${userId}`);
        // Initialize static assets first
        yield initializeUserStaticAssets(userId);
        // Then scan for detected assets
        const files = yield googleDriveService.listFiles(accessToken);
        const extractedAssets = [];
        for (const file of files || []) {
            try {
                console.log(`Processing file: ${file.name} (ID: ${file.id})`);
                const { extractedData } = yield googleDriveService.processFile(file.id, accessToken);
                if (extractedData && 'name' in extractedData && extractedData.name) {
                    extractedAssets.push(extractedData);
                }
            }
            catch (error) {
                console.error(`Error processing file ${file.id}:`, error);
                // Continue with next file
            }
        }
        const missingAssets = yield googleDriveService.findMissingAssets(extractedAssets, userId);
        // Save detected assets regardless of whether they're "missing" or not
        for (const asset of extractedAssets) {
            // Check if already exists to avoid duplicates
            const existingAsset = yield assetSchema_1.Asset.findOne({
                name: asset.name,
                type: asset.type,
                userId,
                source: 'detected'
            });
            if (!existingAsset) {
                const newAsset = new assetSchema_1.Asset(Object.assign(Object.assign({}, asset), { userId, source: 'detected' }));
                yield newAsset.save();
                console.log(`Added detected asset: ${asset.name}`);
            }
        }
        console.log(`Asset scan completed for user ${userId}`);
        return true;
    }
    catch (error) {
        console.error("Error in automatic asset scanning:", error);
        throw error;
    }
});
// Helper function to initialize static assets for a user
const initializeUserStaticAssets = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if user already has static assets
        const existingStaticAssets = yield assetSchema_1.Asset.find({ userId, source: 'static' });
        if (existingStaticAssets.length === 0) {
            // Define static assets
            const staticAssets = [
                { name: 'HDFC Savings', type: 'bank_account', source: 'static', userId },
                { name: 'ICICI Current', type: 'bank_account', source: 'static', userId },
                { name: 'LIC Term Plan', type: 'insurance', source: 'static', userId },
                { name: 'Star Health Policy', type: 'insurance', source: 'static', userId }
            ];
            // Insert static assets
            yield assetSchema_1.Asset.insertMany(staticAssets);
            console.log(`Initialized static assets for user ${userId}`);
        }
        else {
            console.log(`User ${userId} already has static assets`);
        }
    }
    catch (error) {
        console.error("Error initializing static assets:", error);
        throw error;
    }
});
