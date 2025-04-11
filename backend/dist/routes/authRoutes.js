"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Authcontroller_1 = require("../controllers/Authcontroller");
const router = express_1.default.Router();
router.post("/signup", Authcontroller_1.signup);
router.post("/login", Authcontroller_1.Login);
exports.default = router;
