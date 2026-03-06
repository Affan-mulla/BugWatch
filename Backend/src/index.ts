import express from "express";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import cors from "cors";
import { env, validateRequiredEnv } from "./config/env.js";
import { logger } from "./logging/logger.js";
import { initializeDatabase, shutdownDatabase } from "./db/client.js";
import { setAppBooted } from "./controllers/healthController.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";

validateRequiredEnv();

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);
app.use(webhookRoutes);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use(authRoutes);
app.use(apiRoutes);
app.use(errorHandler);

void (async () => {
  await initializeDatabase();
  setAppBooted(true);

  app.listen(env.port, () => {
    logger.info("Server booted", { port: env.port });
  });
})().catch((error) => {
  logger.error("Server startup failed", {
    message: error instanceof Error ? error.message : "Unknown startup error",
  });
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (async () => {
      logger.info("Shutting down database pool", { signal });
      await shutdownDatabase();
      process.exit(0);
    })();
  });
}
