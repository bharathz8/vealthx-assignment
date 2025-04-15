import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  
  googleId?: string;
  email: string;
  name?: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  lastLogin?: Date;
  lastScanCompleted?: Date;
  lastScanResults?: {
    scannedFiles: number;
    extractedAssets: number;
    savedAssets: number;
    errors?: number;
    missingAssetsFound: number;
  };
}

const userSchema = new Schema({
  googleId: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String },
  refreshToken: { type: String },
  accessToken: { type: String },
  tokenExpiry: { type: Date },
});

export const User = mongoose.model<IUser>('User', userSchema);