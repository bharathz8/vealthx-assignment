import express from 'express';
import cors from 'cors';
import { connectedDB } from './config/db.js';
import dotenv from 'dotenv';
import assetRoutes from "./routes/assetRoutes.js";
import googleDriveRoutes from './routes/googleDriveRoutes.js';
import googleOAuthRoutes from "./routes/googleOAuthRoutes.js";
dotenv.config();
connectedDB();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self' https://accounts.google.com https://*.gstatic.com; " +
        "script-src 'self' https://accounts.google.com https://*.gstatic.com 'unsafe-inline' 'unsafe-eval'; " +
        "frame-src 'self' https://accounts.google.com; " +
        "connect-src *;");
    next();
});
app.get('/oauth-success', (req, res) => {
    res.send('OAuth login successful! You can close this window.');
});
app.use('/api/assets', assetRoutes);
app.use('/api/googledrive', googleDriveRoutes);
app.use('/api/auth', googleOAuthRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
