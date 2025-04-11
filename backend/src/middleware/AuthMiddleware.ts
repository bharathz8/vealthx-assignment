import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

interface AuthRequest extends Request {
    userId?: string;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ msg: "Access denied. No token provided." });
    return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        req.userId = decoded.id;
        next();
    } catch (e) {
        console.log("Error in JWT verification:", e);
        res.status(403).json({ msg: "Invalid or expired token" });
        return;
    }
};

export default authMiddleware;