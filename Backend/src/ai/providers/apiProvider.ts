import { buildExplanationPrompt } from "../promptBuilder.js";
import type { AIExplanation, AIInput, AIProvider } from "../aiProvider.js";
import { AIProviderError, AIProviderTimeoutError } from "../../errors/AIProviderError.js";

interface ApiProviderOptions {
  endpoint: string;
  timeoutMs: number;
  apiKey?: string;
}

export class ApiProvider implements AIProvider {
  private readonly endpoint: string;

  private readonly timeoutMs: number;

  private readonly apiKey?: string;

  constructor(options: ApiProviderOptions) {
    this.endpoint = options.endpoint;
    this.timeoutMs = options.timeoutMs;
    this.apiKey = options.apiKey;
  }

  async generateExplanation(input: AIInput): Promise<AIExplanation[]> {
    const prompt = buildExplanationPrompt(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI API request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: unknown;
        explanations?: unknown;
      };

      const candidates = payload.explanations ?? payload.data;

      if (!Array.isArray(candidates)) {
        throw new Error("AI API response must contain an explanations array");
      }

      return candidates as AIExplanation[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderTimeoutError(`AI API request timed out after ${this.timeoutMs}ms`, {
          timeoutMs: this.timeoutMs,
          provider: "api",
        });
      }

      throw new AIProviderError("API provider request failed", { provider: "api" }, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
