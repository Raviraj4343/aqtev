import mongoose from "mongoose";
import { DB_NAME, MONGODB_URI } from "../constants.js";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }
  try {
    const baseUri =
      process.env.MONGODB_URL || MONGODB_URI || "mongodb://127.0.0.1:27017";
    let uri = baseUri.replace(/\/$/, "");

    // If the URI does not already include a database path, append DB_NAME
    const parts = uri.split("/");
    if (parts.length === 3) {
      uri = `${uri}/${DB_NAME}`;
    }

    // mongoose 6+ enables the new parser/unified topology by default
    const connectionInstance = await mongoose.connect(uri);

    isConnected = true;
    console.log(
      `\n✅ MongoDB connected! Host: ${connectionInstance.connection.host}\n`
    );

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });
  } catch (error) {
    console.error("❌ MongoDB connection FAILED:", error.message);
    process.exit(1);
  }
};

export default connectDB;
