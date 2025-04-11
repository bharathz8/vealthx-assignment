"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleOAuthController_1 = require("../controllers/googleOAuthController");
const router = express_1.default.Router();
// Google OAuth authentication
router.post("/google", googleOAuthController_1.googleAuth);
exports.default = router;
