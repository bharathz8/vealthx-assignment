import express from 'express';
import * as assetController from "../controllers/assetController.js";
import authMiddleware from '../middleware/AuthMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, assetController.getAllAssets);
router.get('/static', authMiddleware, assetController.getStaticAssets);
router.get('/detected', authMiddleware, assetController.getDetectedAssets);
router.get("/missing", authMiddleware, assetController.getMissingAssets);
router.post('/add-missing', authMiddleware, assetController.addMissingAsset);
router.post('/initialize-static', authMiddleware, assetController.initializeStaticAssets);

export default router;