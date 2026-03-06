import type { NextFunction, Request, Response } from "express";
import { logger } from "../logging/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    logger.info("HTTP request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}
