import { AppError } from "./AppError.js";

export class AuthError extends AppError {
  constructor(message: string, statusCode = 401, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "AUTH_ERROR",
      statusCode,
      retryable: false,
      details,
      cause,
    });
  }
}
