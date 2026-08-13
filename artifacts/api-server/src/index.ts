import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { connectDatabase } from "./db/mongoose";

const port = env.PORT;

async function start() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  } catch (error) {
    logger.error({ err: error }, "Server failed to start");
    process.exit(1);
  }
}

start();
