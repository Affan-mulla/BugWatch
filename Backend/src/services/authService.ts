import crypto from "crypto";
import { env } from "../config/env.js";
import { userRepository } from "../repositories/userRepository.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { AuthError } from "../errors/AuthError.js";

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string | null;
}

interface OAuthStatePayload {
  nonce: string;
  redirectPath?: string;
  exp: number;
}

export interface SessionView {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string;
  };
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function signPayload(payload: string): string {
  const secret = env.authTokenSecret;
  if (!secret) {
    throw new AuthError("Missing AUTH_TOKEN_SECRET", 500);
  }

  return toBase64Url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function encodeState(payload: OAuthStatePayload): string {
  const raw = JSON.stringify(payload);
  const encoded = toBase64Url(raw);
  return `${encoded}.${signPayload(encoded)}`;
}

function decodeState(input: string): OAuthStatePayload {
  const [encoded, signature] = input.split(".");
  if (!encoded || !signature) {
    throw new AuthError("Invalid OAuth state", 400);
  }

  const expected = signPayload(encoded);
  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) {
    throw new AuthError("Invalid OAuth state signature", 400);
  }

  const payload = JSON.parse(fromBase64Url(encoded).toString("utf8")) as OAuthStatePayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AuthError("OAuth state expired", 400);
  }

  return payload;
}

async function exchangeCodeForToken(code: string): Promise<string> {
  if (!env.githubClientId || !env.githubClientSecret || !env.githubOAuthRedirectUri) {
    throw new AuthError("GitHub OAuth is not configured on the backend", 500);
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "ai-code-review-assistant",
    },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: env.githubOAuthRedirectUri,
    }),
  });

  const body = (await response.json()) as GitHubTokenResponse;
  if (!response.ok || !body.access_token) {
    throw new AuthError(body.error_description ?? "Failed to exchange GitHub OAuth code", 401, {
      status: response.status,
      error: body.error,
    });
  }

  return body.access_token;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "ai-code-review-assistant",
    },
  });

  if (!response.ok) {
    throw new AuthError("Failed to fetch GitHub user profile", 401, {
      status: response.status,
    });
  }

  return (await response.json()) as GitHubUserResponse;
}

export function createOAuthRedirectUrl(redirectPath?: string): string {
  if (!env.githubClientId || !env.githubOAuthRedirectUri) {
    throw new AuthError("GitHub OAuth is not configured on the backend", 500);
  }

  const state = encodeState({
    nonce: crypto.randomUUID(),
    redirectPath,
    exp: Math.floor(Date.now() / 1000) + 600,
  });

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.githubClientId);
  url.searchParams.set("redirect_uri", env.githubOAuthRedirectUri);
  url.searchParams.set("scope", "repo read:user");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function createSessionFromOAuthCode(code: string, state: string): Promise<SessionView> {
  decodeState(state);

  await sessionRepository.deleteExpired();

  const accessToken = await exchangeCodeForToken(code);
  const githubUser = await fetchGitHubUser(accessToken);
  const user = await userRepository.upsert({
    githubId: githubUser.id,
    username: githubUser.login,
    avatarUrl: githubUser.avatar_url ?? undefined,
  });

  const sessionToken = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.authSessionTtlSeconds * 1000).toISOString();

  await sessionRepository.create({
    token: sessionToken,
    userId: user.id,
    githubAccessToken: accessToken,
    expiresAt,
  });

  return {
    token: sessionToken,
    expiresAt,
    user: {
      id: String(user.id),
      username: user.username,
      avatarUrl: user.avatarUrl ?? "",
    },
  };
}
