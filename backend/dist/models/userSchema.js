import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema({
    googleId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    picture: { type: String },
    refreshToken: { type: String },
    accessToken: { type: String },
    tokenExpiry: { type: Date },
});
export const User = mongoose.model('User', userSchema);
