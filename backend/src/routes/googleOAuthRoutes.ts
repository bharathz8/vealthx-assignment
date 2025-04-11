import express from "express";
import { googleAuth } from "../controllers/googleOAuthController";
const router = express.Router();

// Google OAuth authentication
router.post("/google", googleAuth);

export default router;