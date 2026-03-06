import { describe, expect, it, vi } from "vitest";
import { processPullRequestWebhook } from "./pullRequestReviewService.js";
import type { PullRequestWebhookPayload } from "../webhooks/extractPullRequestMetadata.js";
import { GitHubRateLimitError } from "../errors/GitHubError.js";

function buildPayload(action = "opened"): PullRequestWebhookPayload {
  return {
    action,
    installation: { id: 123 },
    repository: {
      id: 9001,
      name: "repo",
      owner: { login: "owner" },
    },
    pull_request: {
      id: 10001,
      number: 10,
      title: "Improve checks",
      state: "open",
      merged_at: null,
      html_url: "https://example.test/pr/10",
      user: { login: "author" },
      head: { sha: "headsha123" },
      base: { sha: "basesha456" },
    },
  };
}

describe("pullRequestReviewService", () => {
  it("skips duplicate delivery IDs", async () => {
    const createInstallationOctokit = vi.fn();

    const result = await processPullRequestWebhook(
      {
        payload: buildPayload(),
        event: "pull_request",
        deliveryId: "delivery-1",
      },
      {
        createInstallationOctokit: createInstallationOctokit as any,
        listPullRequestFiles: vi.fn() as any,
        postPullRequestReviewComment: vi.fn() as any,
        runStaticAnalysis: vi.fn() as any,
        generateAiReview: vi.fn() as any,
        formatReviewComment: vi.fn() as any,
        webhookRepository: {
          findByDeliveryId: vi.fn().mockResolvedValue({ status: "success", processedAt: new Date().toISOString() }),
          createDelivery: vi.fn(),
          updateStatus: vi.fn(),
        } as any,
        reviewRepository: {
          findByRepoAndPullNumberAndSha: vi.fn(),
          create: vi.fn(),
          countSeverities: vi.fn().mockReturnValue({ highCount: 0, mediumCount: 0, lowCount: 0 }),
        } as any,
        repositoryRepository: { upsert: vi.fn() } as any,
        prRepository: { upsert: vi.fn() } as any,
        issueRepository: { insertMany: vi.fn() } as any,
        withTransaction: vi.fn(),
      }
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Duplicate webhook delivery");
    expect(createInstallationOctokit).not.toHaveBeenCalled();
  });

  it("skips already reviewed PR SHA", async () => {
    const updateStatus = vi.fn();

    const result = await processPullRequestWebhook(
      {
        payload: buildPayload(),
        event: "pull_request",
        deliveryId: "delivery-2",
      },
      {
        createInstallationOctokit: vi.fn() as any,
        listPullRequestFiles: vi.fn() as any,
        postPullRequestReviewComment: vi.fn() as any,
        runStaticAnalysis: vi.fn() as any,
        generateAiReview: vi.fn() as any,
        formatReviewComment: vi.fn() as any,
        webhookRepository: {
          findByDeliveryId: vi.fn().mockResolvedValue(null),
          createDelivery: vi.fn().mockResolvedValue(undefined),
          updateStatus,
        } as any,
        reviewRepository: {
          findByRepoAndPullNumberAndSha: vi.fn().mockResolvedValue({ id: 99 }),
          create: vi.fn(),
          countSeverities: vi.fn().mockReturnValue({ highCount: 0, mediumCount: 0, lowCount: 0 }),
        } as any,
        repositoryRepository: { upsert: vi.fn() } as any,
        prRepository: { upsert: vi.fn() } as any,
        issueRepository: { insertMany: vi.fn() } as any,
        withTransaction: vi.fn(),
      }
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("already reviewed");
    expect(updateStatus).toHaveBeenCalledWith("delivery-2", "skipped");
  });

  it("fails gracefully when GitHub posting is rate limited", async () => {
    const updateStatus = vi.fn();
    const withTransaction = vi.fn().mockImplementation(async (handler) =>
      handler({
        query: vi.fn(),
      })
    );

    const result = await processPullRequestWebhook(
      {
        payload: buildPayload(),
        event: "pull_request",
        deliveryId: "delivery-3",
      },
      {
        createInstallationOctokit: vi.fn().mockResolvedValue({}) as any,
        listPullRequestFiles: vi.fn().mockResolvedValue([
          {
            filename: "src/example.ts",
            status: "modified",
            additions: 3,
            deletions: 0,
            changes: 3,
            patch: "+eval(input)",
          },
        ]) as any,
        postPullRequestReviewComment: vi
          .fn()
          .mockRejectedValue(new GitHubRateLimitError("rate limited", { status: 403 })) as any,
        runStaticAnalysis: vi
          .fn()
          .mockReturnValue({
            astMetadata: [],
            issues: [
              {
                ruleId: "no-eval",
                message: "Avoid eval",
                severity: "high",
                filePath: "src/example.ts",
                line: 1,
              },
            ],
            warnings: [],
          }) as any,
        generateAiReview: vi
          .fn()
          .mockResolvedValue({
            summary: "summary",
            aiStatus: "fallback",
            enrichedIssues: [
              {
                ruleId: "no-eval",
                message: "Avoid eval",
                severity: "high",
                filePath: "src/example.ts",
                line: 1,
                explanation: "fallback explanation",
                recommendation: "avoid eval",
                usedFallback: true,
              },
            ],
          }) as any,
        formatReviewComment: vi.fn().mockReturnValue("body") as any,
        webhookRepository: {
          findByDeliveryId: vi.fn().mockResolvedValue(null),
          createDelivery: vi.fn().mockResolvedValue(undefined),
          updateStatus,
        } as any,
        reviewRepository: {
          findByRepoAndPullNumberAndSha: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 11 }),
          countSeverities: vi.fn().mockReturnValue({ highCount: 1, mediumCount: 0, lowCount: 0 }),
        } as any,
        repositoryRepository: { upsert: vi.fn().mockResolvedValue({ id: 22 }) } as any,
        prRepository: { upsert: vi.fn().mockResolvedValue({ id: 33 }) } as any,
        issueRepository: { insertMany: vi.fn().mockResolvedValue(undefined) } as any,
        withTransaction,
      }
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Review post skipped");
    expect(updateStatus).toHaveBeenCalledWith("delivery-3", "failed", "Review post skipped after retries");
  });
});
