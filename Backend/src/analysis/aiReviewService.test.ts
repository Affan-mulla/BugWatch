import { describe, expect, it } from "vitest";
import { generateAiReview } from "./aiReviewService.js";
import type { AIProvider } from "../ai/aiProvider.js";
import type { AnalysisIssue } from "./types.js";

const issues: AnalysisIssue[] = [
  {
    ruleId: "no-eval",
    message: "Avoid eval",
    severity: "high",
    filePath: "src/example.ts",
    line: 10,
    column: 2,
    suggestion: "Use safer alternatives",
  },
];

describe("aiReviewService", () => {
  it("uses validated AI explanations when provider succeeds", async () => {
    const provider: AIProvider = {
      generateExplanation: async () => [
        {
          ruleId: "no-eval",
          explanation: "eval executes dynamic code and increases attack surface",
          recommendation: "Replace eval with safe dispatching",
        },
      ],
    };

    const result = await generateAiReview({
      metadata: {
        action: "opened",
        pullRequestState: "open",
        mergedAt: null,
        installationId: 1,
        owner: "owner",
        repo: "repo",
        pullNumber: 1,
        title: "title",
        headSha: "head",
        baseSha: "base",
      },
      issues,
      provider,
    });

    expect(result.aiStatus).toBe("success");
    expect(result.enrichedIssues[0]?.usedFallback).toBe(false);
    expect(result.enrichedIssues[0]?.recommendation).toContain("safe dispatching");
  });

  it("falls back deterministically when provider fails", async () => {
    const provider: AIProvider = {
      generateExplanation: async () => {
        throw new Error("provider unavailable");
      },
    };

    const result = await generateAiReview({
      metadata: {
        action: "opened",
        pullRequestState: "open",
        mergedAt: null,
        installationId: 1,
        owner: "owner",
        repo: "repo",
        pullNumber: 1,
        title: "title",
        headSha: "head",
        baseSha: "base",
      },
      issues,
      provider,
    });

    expect(result.aiStatus).toBe("fallback");
    expect(result.enrichedIssues[0]?.usedFallback).toBe(true);
    expect(result.enrichedIssues[0]?.explanation).toContain("Rule: no-eval");
  });
});
