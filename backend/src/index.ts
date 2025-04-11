import express from 'express';
import cors from 'cors';
import { connectedDB } from './config/db';
import dotenv from 'dotenv';
import assetRoutes from "./routes/assetRoutes";
import googleDriveRoutes from './routes/googleDriveRoutes';
import googleOAuthRoutes from "./routes/googleOAuthRoutes";

dotenv.config();

connectedDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self'; frame-src 'self' https://accounts.google.com"
  );
  next();
});

app.use('/api/assets', assetRoutes);
app.use('/api/googledrive', googleDriveRoutes);
app.use('/api', googleOAuthRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});