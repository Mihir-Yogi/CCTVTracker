import path from "node:path";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  BASE_PATH: process.env.BASE_PATH ?? "/",
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  MONGODB_DATABASE: process.env.MONGODB_DATABASE ?? "camops",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "development-session-secret-change-me",
  BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ?? "",
  APP_URL: process.env.APP_URL ?? "http://localhost:5000",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:4174",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "CamOps <onboarding@resend.dev>",
};
