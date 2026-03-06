import type { AnalysisIssue } from "./types.js";
import type { PullRequestMetadata } from "../webhooks/extractPullRequestMetadata.js";
import type { AIProvider } from "../ai/aiProvider.js";
import { validateAIResponse } from "../ai/schemaValidator.js";
import { OllamaProvider } from "../ai/providers/ollamaProvider.js";
import { ApiProvider } from "../ai/providers/apiProvider.js";
import { env } from "../config/env.js";
import { AIProviderError, AIProviderTimeoutError } from "../errors/AIProviderError.js";

export interface EnrichedIssue extends AnalysisIssue {
  ruleId: string;
  explanation: string;
  recommendation: string;
  usedFallback: boolean;
}

export interface AiReviewResult {
  summary: string;
  enrichedIssues: EnrichedIssue[];
  aiStatus: "success" | "partial-fallback" | "fallback";
}

interface GenerateAiReviewInput {
  metadata: PullRequestMetadata;
  issues: AnalysisIssue[];
  provider?: AIProvider;
  fileContext?: string;
}

const DEFAULT_RECOMMENDATION = "Review this pattern and refactor accordingly.";

function buildFallback(issue: AnalysisIssue): EnrichedIssue {
  const fallbackExplanation = [
    `Rule: ${issue.ruleId}`,
    `Severity: ${issue.severity}`,
    "Why this matters:",
    issue.message,
  ].join("\n");

  return {
    ...issue,
    explanation: fallbackExplanation,
    recommendation: issue.suggestion ?? DEFAULT_RECOMMENDATION,
    usedFallback: true,
  };
}

function createProviderFromEnv(): AIProvider {
  const timeoutMs = Math.min(env.aiTimeoutMs ?? 8000, 8000);
  const providerName = env.aiProvider ?? "ollama";

  if (providerName === "api") {
    if (!env.aiApiEndpoint) {
      throw new AIProviderError("AI API endpoint is not configured", { provider: "api" });
    }

    return new ApiProvider({
      endpoint: env.aiApiEndpoint,
      apiKey: env.aiApiKey,
      timeoutMs,
    });
  }

  return new OllamaProvider({
    baseUrl: env.ollamaBaseUrl ?? "http://lo  calhost:11434",
    model: env.ollamaModel ?? "llama3.1:8b",
    timeoutMs,
  });
}

function mergeIssuesWithExplanations(
  issues: AnalysisIssue[],
  explanations: Array<{ ruleId: string; explanation: string; recommendation: string }>
): AiReviewResult {
  const explanationByRuleId = new Map<string, { explanation: string; recommendation: string }>();

  for (const explanation of explanations) {
    explanationByRuleId.set(explanation.ruleId, {
      explanation: explanation.explanation,
      recommendation: explanation.recommendation,
    });
  }

  const enrichedIssues: EnrichedIssue[] = issues.map((issue) => {
    const explanation = explanationByRuleId.get(issue.ruleId);

    if (!explanation) {
      return buildFallback(issue);
    }

    return {
      ...issue,
      explanation: explanation.explanation,
      recommendation: explanation.recommendation,
      usedFallback: false,
    };
  });

  const usedFallbackCount = enrichedIssues.filter((item) => item.usedFallback).length;
  const aiStatus =
    usedFallbackCount === 0
      ? "success"
      : usedFallbackCount === enrichedIssues.length
        ? "fallback"
        : "partial-fallback";

  return {
    summary: `Detected ${issues.length} potential issue(s) for PR.`,
    enrichedIssues,
    aiStatus,
  };
}

export async function generateAiReview({
  metadata: _metadata,
  issues,
  provider,
  fileContext,
}: GenerateAiReviewInput): Promise<AiReviewResult> {
  const activeProvider = provider ?? createProviderFromEnv();
  const knownRuleIds = new Set(issues.map((issue) => issue.ruleId));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const aiRaw = await activeProvider.generateExplanation({
        issues,
        fileContext,
      });

      const validated = validateAIResponse(aiRaw, knownRuleIds);
      return mergeIssuesWithExplanations(issues, validated);
    } catch (error) {
      if (attempt === 1 || error instanceof AIProviderTimeoutError) {
        const enrichedIssues = issues.map((issue) => buildFallback(issue));

        return {
          summary: `Detected ${issues.length} potential issue(s) for PR.`,
          enrichedIssues,
          aiStatus: "fallback",
        };
      }

      if (!(error instanceof AIProviderError) && !(error instanceof Error)) {
        break;
      }
    }
  }

  const enrichedIssues = issues.map((issue) => buildFallback(issue));
  return {
    summary: `Detected ${issues.length} potential issue(s) for PR.`,
    enrichedIssues,
    aiStatus: "fallback",
  };
}
