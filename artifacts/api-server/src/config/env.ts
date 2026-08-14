import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const findEnvPath = () => {
  const candidates = [process.cwd()];
  let current = process.cwd();

  while (true) {
    const envPath = path.join(current, ".env");
    if (fs.existsSync(envPath)) {
      return envPath;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return path.resolve(process.cwd(), ".env");
};

dotenv.config({ path: findEnvPath() });

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
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "",
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? "CamOps",
};
