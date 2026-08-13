import mongoose from "mongoose";
import { logger } from "../lib/logger";
import { env } from "../config/env";

export async function connectDatabase(): Promise<void> {
  const uri = env.MONGODB_URI;

  if (!uri) {
    logger.warn("MONGODB_URI is not set; authentication will run with a non-persistent dev fallback.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: env.MONGODB_DATABASE,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info({ database: env.MONGODB_DATABASE }, "Connected to MongoDB Atlas");
  } catch (error) {
    logger.error({ err: error }, "MongoDB Atlas connection failed");
    throw error;
  }
}

export function isMongoConfigured(): boolean {
  return Boolean(env.MONGODB_URI);
}
