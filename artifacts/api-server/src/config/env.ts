import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 5000),
  BASE_PATH: process.env.BASE_PATH ?? "/",
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  MONGODB_DATABASE: process.env.MONGODB_DATABASE ?? "camops",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "development-session-secret-change-me",
  BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET ?? "",
  APP_URL: process.env.APP_URL ?? "http://localhost:5000",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
};
