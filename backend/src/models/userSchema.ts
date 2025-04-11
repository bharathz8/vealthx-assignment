import mongoose, { Document, Schema } from "mongoose";

interface IUser extends Document {
    name: string;
    email: string;
    googleId: string;
    picture?: string;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    picture: { type: String }
}, {
    timestamps: true
});

const User = mongoose.model<IUser>("User", userSchema);
export { User, IUser };