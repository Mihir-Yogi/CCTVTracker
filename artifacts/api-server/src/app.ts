import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";
import { env } from "./config/env";

const app: Express = express();
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:4174",
  "http://127.0.0.1:4174",
  "http://localhost:4175",
  "http://127.0.0.1:4175",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);
app.use("/api", router);

export default app;
