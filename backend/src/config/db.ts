import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("database got connected");
    } catch(e) {
        console.log(e, "error in connecting database");
    }
}
