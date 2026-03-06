import { initializeDatabase, shutdownDatabase } from "./client.js";
import { logger } from "../logging/logger.js";

void (async () => {
  try {
    await initializeDatabase();
    logger.info("Migrations completed");
  } finally {
    await shutdownDatabase();
  }
})();
