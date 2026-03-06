export interface AppErrorOptions {
  code: string;
  statusCode: number;
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  public readonly retryable: boolean;

  public readonly details?: Record<string, unknown>;

  public readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export class AnalyzerExecutionError extends AppError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super(message, {
      code: "ANALYZER_EXECUTION_ERROR",
      statusCode: 500,
      retryable: false,
      details,
      cause,
    });
  }
}
