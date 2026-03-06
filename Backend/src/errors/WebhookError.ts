import { AppError } from "./AppError.js";

export class WebhookError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "WEBHOOK_ERROR",
      statusCode: 400,
      details,
      cause,
    });
  }
}

export class WebhookVerificationError extends WebhookError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, details, cause);
    this.name = "WebhookVerificationError";
  }
}
