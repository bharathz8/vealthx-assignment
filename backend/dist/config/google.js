import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();
export const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/oauth2callback");
