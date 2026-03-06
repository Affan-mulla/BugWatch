import { request } from "@/api/httpClient";
import type { AuthSession } from "@/types/domain";

interface LoginUrlResponse {
  redirectUrl: string;
}

export async function getGithubLoginUrl(): Promise<string> {
  const response = await request<LoginUrlResponse>("/api/auth/github/login", { auth: false });
  return response.redirectUrl;
}

export async function exchangeGithubCode(code: string, state: string): Promise<AuthSession> {
  return request<AuthSession>("/api/auth/github/exchange", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ code, state }),
  });
}

export async function getCurrentSession(): Promise<AuthSession> {
  return request<AuthSession>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request<void>("/api/auth/logout", { method: "POST" });
}
