var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import jwt from "jsonwebtoken";
import { User } from "../models/userSchema.js";
import dotenv from "dotenv";
import { oauth2Client } from "../config/google.js";
import * as googleDriveService from '../services/googleDriveService.js';
import { Asset } from '../models/assetSchema.js';
import { Types } from 'mongoose';
dotenv.config();
// Generate Google OAuth URL with enhanced scopes
export const getAuthUrl = (req, res) => {
    try {
        const scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive.readonly'
        ];
        // Get current URL for redirect
        const { host, protocol } = req.headers;
        const redirectUri = `${protocol}://${host}/api/auth/oauth2callback`;
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            redirect_uri: process.env.GOOGLE_REDIRECT_URI || redirectUri
        });
        res.json({ url });
    }
    catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({
            error: 'Failed to generate authentication URL',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
// Handle OAuth callback with improved error handling
export const handleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    if (!code) {
        console.error('Missing authorization code in callback');
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=missing-code`);
        return;
    }
    try {
        const { tokens } = yield oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        // Get user info using the access token
        const userInfoResponse = yield fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
        if (!userInfoResponse.ok) {
            const errorText = yield userInfoResponse.text();
            console.error("Failed to get user info:", errorText);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=invalid-token`);
            return;
        }
        const userInfo = yield userInfoResponse.json();
        const { id: googleId, email, name, picture } = userInfo;
        if (!email) {
            console.error("No email returned from Google");
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=missing-email`);
            return;
        }
        // Find or create user with improved flow
        let user = yield User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            // Create new user
            try {
                user = yield User.create({
                    googleId,
                    email,
                    name,
                    picture,
                    createdAt: new Date()
                });
            }
            catch (createError) {
                console.error("Error creating user:", createError);
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=user-creation-failed`);
                return;
            }
        }
        else if (!user.googleId) {
            // Update existing user with googleId
            user.googleId = googleId;
            user.picture = picture || user.picture;
            user.name = name || user.name;
            yield user.save();
        }
        else {
            // Update user info if needed
            if (user.picture !== picture || user.name !== name) {
                user.picture = picture || user.picture;
                user.name = name || user.name;
                yield user.save();
            }
        }
        const userId = user._id.toString();
        // Generate JWT token with additional claims
        const jwtToken = jwt.sign({
            id: userId,
            email: user.email,
            googleId: user.googleId,
            iat: Math.floor(Date.now() / 1000)
        }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY || "24h"
        });
        // Store tokens in database
        user.accessToken = tokens.access_token || undefined;
        user.refreshToken = tokens.refresh_token || user.refreshToken; // Keep existing if not provided
        user.tokenExpiry = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : new Date(Date.now() + (3600 * 1000));
        user.lastLogin = new Date();
        yield user.save();
        // Initiate asset scanning in background
        if (tokens.access_token) {
            void scanUserAssets(userId, tokens.access_token)
                .catch(error => console.error("Error scanning assets:", error));
        }
        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-success?token=${jwtToken}&userId=${userId}`;
        res.redirect(redirectUrl);
    }
    catch (error) {
        console.error('Error in OAuth callback:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth-failed`);
    }
});
// Enhanced asset scanning that directly uses googleDriveService
const scanUserAssets = (userId, accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`Starting automatic asset scan for user ${userId}`);
        // Initialize static assets first
        yield initializeUserStaticAssets(userId);
        // Use the Google Drive service to process files and extract assets
        const { processedFiles, missingDataFound, missingData } = yield googleDriveService.processDriveAndSaveMissingFinancialData(accessToken);
        // Add userId to the assets if not already set
        if (missingData && missingData.length > 0) {
            for (const asset of missingData) {
                if (!asset.userId) {
                    asset.userId = new Types.ObjectId(userId);
                }
            }
            // Update or insert assets with userId
            const bulkOps = missingData.map(asset => ({
                updateOne: {
                    filter: {
                        fileId: asset.fileId,
                        source: 'detected'
                    },
                    update: Object.assign(Object.assign({}, asset), { userId }),
                    upsert: true
                }
            }));
            if (bulkOps.length > 0) {
                yield Asset.bulkWrite(bulkOps);
            }
        }
        // Update user record with scan results
        const user = yield User.findById(userId);
        if (user) {
            user.lastScanCompleted = new Date();
            user.lastScanResults = {
                scannedFiles: processedFiles,
                extractedAssets: missingDataFound,
                savedAssets: missingDataFound,
                missingAssetsFound: missingDataFound
            };
            yield user.save();
        }
        console.log(`Asset scan completed for user ${userId}. Processed ${processedFiles} files, found ${missingDataFound} missing assets`);
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
        const existingStaticAssets = yield Asset.find({ userId, source: 'static' });
        if (existingStaticAssets.length === 0) {
            let staticAssets = [];
            try {
                // Try to use the config list first
                const staticList = require('../config/staticList.json');
                // Create assets from the static list
                staticAssets = [
                    ...staticList.bank_accounts.map((name) => ({
                        name,
                        type: 'bank_account',
                        source: 'static',
                        userId
                    })),
                    ...staticList.insurances.map((name) => ({
                        name,
                        type: 'insurance',
                        source: 'static',
                        userId
                    }))
                ];
            }
            catch (configError) {
                // Fall back to hardcoded list if config can't be loaded
                staticAssets = [
                    { name: 'HDFC Savings', type: 'bank_account', source: 'static', userId },
                    { name: 'ICICI Current', type: 'bank_account', source: 'static', userId },
                    { name: 'LIC Term Plan', type: 'insurance', source: 'static', userId },
                    { name: 'Star Health Policy', type: 'insurance', source: 'static', userId }
                ];
            }
            // Insert static assets
            if (staticAssets.length > 0) {
                yield Asset.insertMany(staticAssets);
                console.log(`Initialized ${staticAssets.length} static assets for user ${userId}`);
            }
        }
    }
    catch (error) {
        console.error(`Error initializing static assets for user ${userId}:`, error);
        throw error;
    }
});
