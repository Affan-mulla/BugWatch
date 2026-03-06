import type { Octokit } from "@octokit/rest";
import { GitHubError, GitHubRateLimitError } from "../errors/GitHubError.js";

export interface PullRequestChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
}

export type PullRequestStateFilter = "open" | "closed" | "all";

export interface RepositoryPullRequest {
  githubPrId: number;
  number: number;
  title: string;
  author: string;
  state: "open" | "closed";
  mergedAt: string | null;
  headSha: string;
  baseSha: string;
  createdAt: string;
  updatedAt: string;
}

function toPullRequestState(value: string): "open" | "closed" {
  return value === "closed" ? "closed" : "open";
}

interface ListPullRequestFilesInput {
  octokit: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
}

interface ListRepositoryPullRequestsInput {
  octokit: Octokit;
  owner: string;
  repo: string;
  state: PullRequestStateFilter;
  page: number;
  pageSize: number;
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
    return new GitHubRateLimitError("GitHub rate limit reached while listing PR files", { status, message }, error);
  }

  return new GitHubError("Failed to list pull request files", { status, message }, error);
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

  throw lastError ?? new GitHubError("Failed to list pull request files after retry attempts");
}

export async function listPullRequestFiles({
  octokit,
  owner,
  repo,
  pullNumber,
}: ListPullRequestFilesInput): Promise<PullRequestChangedFile[]> {
  const files = await executeWithRetry(() =>
    octokit.paginate(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    })
  );

  return files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch ?? "",
  }));
}

export async function listRepositoryPullRequests({
  octokit,
  owner,
  repo,
  state,
  page,
  pageSize,
}: ListRepositoryPullRequestsInput): Promise<{ items: RepositoryPullRequest[]; total: number }> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));

  const response = await executeWithRetry(() =>
    octokit.pulls.list({
      owner,
      repo,
      state,
      page: safePage,
      per_page: safePageSize,
    })
  );

  const totalFromHeader = response.headers.link
    ? (() => {
        const match = /[?&]page=(\d+)>; rel="last"/.exec(response.headers.link);
        if (!match) {
          return undefined;
        }
        const lastPage = Number(match[1]);
        return Number.isFinite(lastPage) ? lastPage * safePageSize : undefined;
      })()
    : undefined;

  return {
    items: response.data.map((pull) => ({
      githubPrId: pull.id,
      number: pull.number,
      title: pull.title,
      author: pull.user?.login ?? "unknown",
      state: toPullRequestState(pull.state),
      mergedAt: pull.merged_at,
      headSha: pull.head.sha,
      baseSha: pull.base.sha,
      createdAt: pull.created_at,
      updatedAt: pull.updated_at,
    })),
    total: totalFromHeader ?? (safePage - 1) * safePageSize + response.data.length,
  };
}
