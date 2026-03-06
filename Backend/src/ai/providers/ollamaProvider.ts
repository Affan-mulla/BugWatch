import { buildExplanationPrompt } from "../promptBuilder.js";
import type { AIExplanation, AIInput, AIProvider } from "../aiProvider.js";
import { AIProviderError, AIProviderTimeoutError } from "../../errors/AIProviderError.js";

interface OllamaProviderOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;

  private readonly model: string;

  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions) {
    this.baseUrl = options.baseUrl;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
  }

  async generateExplanation(input: AIInput): Promise<AIExplanation[]> {
    const prompt = buildExplanationPrompt(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: "json",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { response?: string };

      if (!payload.response || payload.response.trim().length === 0) {
        throw new Error("Ollama returned an empty response body");
      }

      const parsed = JSON.parse(payload.response) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Ollama response JSON must be an array");
      }

      return parsed as AIExplanation[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIProviderTimeoutError(`Ollama request timed out after ${this.timeoutMs}ms`, {
          timeoutMs: this.timeoutMs,
          provider: "ollama",
        });
      }

      throw new AIProviderError("Ollama provider request failed", { provider: "ollama" }, error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
