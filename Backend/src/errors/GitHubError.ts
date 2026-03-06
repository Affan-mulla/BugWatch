import { AppError } from "./AppError.js";

export class GitHubError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "GITHUB_ERROR",
      statusCode: 502,
      retryable: true,
      details,
      cause,
    });
  }
}

export class GitHubAuthError extends GitHubError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, details, cause);
    this.name = "GitHubAuthError";
  }
}

export class GitHubRateLimitError extends GitHubError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, details, cause);
    this.name = "GitHubRateLimitError";
  }
}
