import { Response, Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/userSchema";
import { IAsset } from "../models/assetSchema";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import * as googleDriveService from '../services/googleDriveService';
import { Asset } from '../models/assetSchema';
import { Document } from "mongoose";
import { TokenPayload } from 'google-auth-library';

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Process Google OAuth token and authenticate
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, accessToken } = req.body;
        
        if (!token) {
            res.status(400).json({ msg: "No token provided" });
            return;
        }

        console.log(token);

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
        
        const payload = ticket.getPayload() as TokenPayload;

        if (!payload || !payload.email || !payload.sub) {
          res.status(400).json({ msg: 'Invalid token payload' });
          return;
        }

        const { sub: googleId, email, name, picture } = payload;
        
        // Find or create user
        let user = await User.findOne({ googleId });
        
        if (!user) {
            // Check if a user with this email already exists
            user = await User.findOne({ email });
            
            if (user) {
                // Update existing user with Google ID
                user.googleId = googleId;
                user.picture = picture;
                await user.save();
            } else {
                // Create new user with Google data
                user = await User.create({
                    googleId,
                    email,
                    name,
                    picture
                });
            }
        }
        
        const userId = (user._id as any).toString();
        
        // Generate JWT token
        const jwtToken = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
            expiresIn: "24h"
        });
        
        // Initiate asset scanning in background (don't wait for completion)
        if (accessToken) {
            void scanUserAssets(userId, accessToken)
                .catch(error => console.error("Error scanning assets:", error));
        } else {
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
        
    } catch (error) {
        console.error("Google authentication error:", error);
        res.status(500).json({ msg: "Error authenticating with Google" });
    }
};

const scanUserAssets = async (userId: string, accessToken: string): Promise<boolean> => {
    try {
        console.log(`Starting automatic asset scan for user ${userId}`);
        
        // Initialize static assets first
        await initializeUserStaticAssets(userId);
        
        // Then scan for detected assets
        const files = await googleDriveService.listFiles(accessToken);
          
        const extractedAssets: Partial<IAsset>[] = [];
        
        for (const file of files || []) {
            try {
                console.log(`Processing file: ${file.name} (ID: ${file.id})`);
                const { extractedData } = await googleDriveService.processFile(file.id!, accessToken);
                
                if (extractedData && 'name' in extractedData && extractedData.name) {
                    extractedAssets.push(extractedData);
                }
            } catch (error) {
                console.error(`Error processing file ${file.id}:`, error);
                // Continue with next file
            }
        }
        
        const missingAssets = await googleDriveService.findMissingAssets(extractedAssets, userId);
        
        // Save detected assets regardless of whether they're "missing" or not
        for (const asset of extractedAssets) {
            // Check if already exists to avoid duplicates
            const existingAsset = await Asset.findOne({
                name: asset.name,
                type: asset.type,
                userId,
                source: 'detected'
            });
            
            if (!existingAsset) {
                const newAsset = new Asset({
                    ...asset,
                    userId,
                    source: 'detected'
                });
                await newAsset.save();
                console.log(`Added detected asset: ${asset.name}`);
            }
        }
        
        console.log(`Asset scan completed for user ${userId}`);
        return true;
    } catch (error) {
        console.error("Error in automatic asset scanning:", error);
        throw error;
    }
};

// Helper function to initialize static assets for a user
const initializeUserStaticAssets = async (userId: string): Promise<void> => {
    try {
        // Check if user already has static assets
        const existingStaticAssets = await Asset.find({ userId, source: 'static' });
        
        if (existingStaticAssets.length === 0) {
            // Define static assets
            const staticAssets = [
                { name: 'HDFC Savings', type: 'bank_account', source: 'static', userId },
                { name: 'ICICI Current', type: 'bank_account', source: 'static', userId },
                { name: 'LIC Term Plan', type: 'insurance', source: 'static', userId },
                { name: 'Star Health Policy', type: 'insurance', source: 'static', userId }
            ];
            
            // Insert static assets
            await Asset.insertMany(staticAssets);
            console.log(`Initialized static assets for user ${userId}`);
        } else {
            console.log(`User ${userId} already has static assets`);
        }
    } catch (error) {
        console.error("Error initializing static assets:", error);
        throw error;
    }
};