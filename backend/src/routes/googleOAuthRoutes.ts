import express from "express";
import { getAuthUrl, handleCallback } from "../controllers/googleOAuthController.js";
const router = express.Router();

// Generate Google OAuth URL
router.get("/url", getAuthUrl);

// Handle OAuth callback
router.get("/oauth2callback", handleCallback);

export default router;


