import session from "express-session";
import MongoStore from "connect-mongo";
import { env } from "../config/env";
import { isMongoConfigured } from "../db/mongoose";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 8,
};

export const sessionMiddleware = session({
  name: "camops.sid",
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: cookieOptions,
  store: isMongoConfigured()
    ? MongoStore.create({
        mongoUrl: env.MONGODB_URI,
        dbName: env.MONGODB_DATABASE,
        collectionName: "sessions",
        stringify: false,
      })
    : undefined,
});
