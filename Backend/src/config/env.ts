import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  port: number;
  databaseUrl?: string;
  githubAppId?: string;
  githubPrivateKey?: string;
  githubWebhookSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubOAuthRedirectUri?: string;
  aiProvider?: "ollama" | "api";
  aiTimeoutMs?: number;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  aiApiEndpoint?: string;
  aiApiKey?: string;
  authTokenSecret?: string;
  authSessionTtlSeconds: number;
  frontendOrigin: string;
  githubInlineReviewMode: boolean;
  maxFilesPerPr: number;
  maxFilePatchKb: number;
  maxAstInputKb: number;
  maxIssuesPerFile: number;
}

export const env: EnvConfig = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  githubAppId: process.env.GITHUB_APP_ID,
  githubPrivateKey: process.env.GITHUB_PRIVATE_KEY,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubOAuthRedirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI,
  aiProvider: (process.env.AI_PROVIDER as "ollama" | "api" | undefined) ?? "ollama",
  aiTimeoutMs: Math.min(Number(process.env.AI_TIMEOUT_MS ?? 8000), 8000),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1:8b",
  aiApiEndpoint: process.env.AI_API_ENDPOINT,
  aiApiKey: process.env.AI_API_KEY,
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? process.env.GITHUB_WEBHOOK_SECRET ?? "dev-auth-secret",
  authSessionTtlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 43200),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  githubInlineReviewMode: process.env.GITHUB_INLINE_REVIEW_MODE === "true",
  maxFilesPerPr: Number(process.env.MAX_FILES_PER_PR ?? 100),
  maxFilePatchKb: Number(process.env.MAX_FILE_PATCH_KB ?? 120),
  maxAstInputKb: Number(process.env.MAX_AST_INPUT_KB ?? 256),
  maxIssuesPerFile: Number(process.env.MAX_ISSUES_PER_FILE ?? 20),
};

export function validateRequiredEnv(): void {
  const required: Array<keyof Pick<EnvConfig, "databaseUrl" | "githubAppId" | "githubPrivateKey" | "githubWebhookSecret">> = [
    "databaseUrl",
    "githubAppId",
    "githubPrivateKey",
    "githubWebhookSecret",
  ];

  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
