type LogLevel = "info" | "warn" | "error";

type LogValue = string | number | boolean | null | undefined | object;

export interface LogContext {
  correlationId?: string;
  [key: string]: LogValue;
}

interface LogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export class Logger {
  private readonly baseContext: LogContext;

  constructor(baseContext: LogContext = {}) {
    this.baseContext = baseContext;
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const mergedContext = { ...this.baseContext, ...context };
    const output: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
    };

    const payload = `${JSON.stringify(output)}\n`;
    if (level === "error") {
      process.stderr.write(payload);
      return;
    }

    process.stdout.write(payload);
  }
}

export const logger = new Logger({ service: "backend" });
