"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const dotenv_1 = __importDefault(require("dotenv"));
const assetRoutes_1 = __importDefault(require("./routes/assetRoutes"));
const googleDriveRoutes_1 = __importDefault(require("./routes/googleDriveRoutes"));
const googleOAuthRoutes_1 = __importDefault(require("./routes/googleOAuthRoutes"));
dotenv_1.default.config();
(0, db_1.connectedDB)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'self'; frame-src 'self' https://accounts.google.com");
    next();
});
app.use('/api/assets', assetRoutes_1.default);
app.use('/api/googledrive', googleDriveRoutes_1.default);
app.use('/api', googleOAuthRoutes_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
