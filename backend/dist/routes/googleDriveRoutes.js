"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleDriveController_1 = require("../controllers/googleDriveController");
const AuthMiddleware_1 = __importDefault(require("../middleware/AuthMiddleware"));
const router = express_1.default.Router();
// Fix: Add authMiddleware to all routes that need authentication
router.get('/files', AuthMiddleware_1.default, googleDriveController_1.listFiles);
router.get('/process/:fileId', AuthMiddleware_1.default, googleDriveController_1.processFile);
router.post('/scan', AuthMiddleware_1.default, googleDriveController_1.scanDocuments);
exports.default = router;
