import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { logger } from "../logging/logger.js";

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): Response {
  if (error instanceof AppError) {
    logger.error("Request failed", {
      code: error.code,
      message: error.message,
      path: req.path,
      method: req.method,
      details: error.details,
    });

    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  logger.error("Unhandled request error", {
    path: req.path,
    method: req.method,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
