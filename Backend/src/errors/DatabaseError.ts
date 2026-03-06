import { AppError } from "./AppError.js";

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "DATABASE_ERROR",
      statusCode: 500,
      retryable: true,
      details,
      cause,
    });
  }
}
