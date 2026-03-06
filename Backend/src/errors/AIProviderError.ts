import { AppError } from "./AppError.js";

export class AIProviderError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "AI_PROVIDER_ERROR",
      statusCode: 502,
      retryable: true,
      details,
      cause,
    });
  }
}

export class AIProviderTimeoutError extends AIProviderError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, details, cause);
    this.name = "AIProviderTimeoutError";
  }
}
