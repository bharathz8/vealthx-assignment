import express from 'express';
import { listFiles, processFile, scanDocuments } from '../controllers/googleDriveController';
import authMiddleware from '../middleware/AuthMiddleware';

const router = express.Router();

// Fix: Add authMiddleware to all routes that need authentication
router.get('/files', authMiddleware, listFiles);
router.get('/process/:fileId', authMiddleware, processFile);
router.post('/scan', authMiddleware, scanDocuments);

export default router;