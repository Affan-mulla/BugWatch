export class ApiError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const TOKEN_STORAGE_KEY = "ai-pr-review-token";

let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: (() => void) | null = null;
let serverErrorHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function setForbiddenHandler(handler: () => void): void {
  forbiddenHandler = handler;
}

export function setServerErrorHandler(handler: () => void): void {
  serverErrorHandler = handler;
}

export function setStoredToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

interface RequestConfig extends RequestInit {
  auth?: boolean;
}

interface ErrorPayload {
  error?: {
    message?: string;
  };
  message?: string;
}

function toUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const headers = new Headers(config.headers);
  headers.set("Content-Type", "application/json");

  if (config.auth !== false) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const init: RequestInit = {
    ...config,
    headers,
    credentials: "include",
  };

  const response = await fetch(toUrl(path), init);
  if (!response.ok) {
    let message = "Request failed";
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as ErrorPayload;
      message = payload.error?.message ?? payload.message ?? message;
    } else {
      message = (await response.text()) || message;
    }
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    if (response.status === 403 && forbiddenHandler) {
      forbiddenHandler();
    }
    if (response.status >= 500 && serverErrorHandler) {
      serverErrorHandler();
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
