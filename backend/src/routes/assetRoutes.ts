import express from 'express';
import * as assetController from "../controllers/assetController";
import authMiddleware from '../middleware/AuthMiddleware';

const router = express.Router();

router.get('/', authMiddleware, assetController.getAllAssets);
router.get('/static', authMiddleware, assetController.getStaticAssets);
router.get('/detected', authMiddleware, assetController.getDetectedAssets);
router.post('/add-missing', authMiddleware, assetController.addMissingAsset);
router.post('/initialize-static', authMiddleware, assetController.initializeStaticAssets);

export default router;