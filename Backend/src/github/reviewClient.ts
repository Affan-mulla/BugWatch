import type { Octokit } from "@octokit/rest";
import { GitHubError, GitHubRateLimitError } from "../errors/GitHubError.js";

export interface InlineReviewComment {
  path: string;
  line: number;
  body: string;
}

interface PostPullRequestReviewCommentInput {
  octokit: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
  summaryBody: string;
  inlineComments?: InlineReviewComment[];
  enableInlineMode?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toGitHubError(error: unknown): GitHubError {
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;
  const message = error instanceof Error ? error.message : "Unknown GitHub API error";
  const lowerMessage = message.toLowerCase();

  const isRateLimit =
    status === 403 && (lowerMessage.includes("rate limit") || lowerMessage.includes("secondary rate limit"));

  if (isRateLimit) {
    return new GitHubRateLimitError("GitHub rate limit reached while posting review", { status, message }, error);
  }

  return new GitHubError("Failed to post pull request review", { status, message }, error);
}

async function executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [300, 900];
  let lastError: GitHubError | null = null;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const typedError = toGitHubError(error);
      lastError = typedError;

      if (!typedError.retryable || attempt === delays.length) {
        throw typedError;
      }

      await sleep(delays[attempt] ?? 0);
    }
  }

  throw lastError ?? new GitHubError("Failed to post pull request review after retry attempts");
}

function chunkComments(comments: InlineReviewComment[], size: number): InlineReviewComment[][] {
  const chunks: InlineReviewComment[][] = [];

  for (let index = 0; index < comments.length; index += size) {
    chunks.push(comments.slice(index, index + size));
  }

  return chunks;
}

export async function postPullRequestReviewComment({
  octokit,
  owner,
  repo,
  pullNumber,
  summaryBody,
  inlineComments = [],
  enableInlineMode = false,
}: PostPullRequestReviewCommentInput): Promise<string | undefined> {
  const validInlineComments = inlineComments.filter(
    (comment) => comment.path.trim().length > 0 && Number.isInteger(comment.line) && comment.line > 0
  );

  if (enableInlineMode && validInlineComments.length > 0) {
    const batches = chunkComments(validInlineComments, 20);
    let firstReviewId: string | undefined;

    try {
      for (const batch of batches) {
        const response = await executeWithRetry(() =>
          octokit.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            event: "COMMENT",
            body: summaryBody,
            comments: batch,
          })
        );

        if (!firstReviewId) {
          firstReviewId = String(response.data.id);
        }
      }

      return firstReviewId;
    } catch {
    }
  }

  const response = await executeWithRetry(() =>
    octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: summaryBody,
    })
  );

  return String(response.data.id);
}
