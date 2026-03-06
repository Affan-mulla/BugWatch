import type { Octokit } from "@octokit/rest";
import { GitHubError, GitHubRateLimitError } from "../errors/GitHubError.js";

export interface VisibleRepository {
  id: number;
  owner: string;
  name: string;
}

export interface RepositoryInstallation {
  installationId: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toGitHubError(error: unknown, fallbackMessage: string): GitHubError {
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;
  const message = error instanceof Error ? error.message : "Unknown GitHub API error";
  const lowerMessage = message.toLowerCase();

  const isRateLimit =
    status === 403 && (lowerMessage.includes("rate limit") || lowerMessage.includes("secondary rate limit"));

  if (isRateLimit) {
    return new GitHubRateLimitError(fallbackMessage, { status, message }, error);
  }

  return new GitHubError(fallbackMessage, { status, message }, error);
}

async function executeWithRetry<T>(operation: () => Promise<T>, fallbackMessage: string): Promise<T> {
  const delays = [300, 900];
  let lastError: GitHubError | null = null;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const typedError = toGitHubError(error, fallbackMessage);
      lastError = typedError;

      if (!typedError.retryable || attempt === delays.length) {
        throw typedError;
      }

      await sleep(delays[attempt] ?? 0);
    }
  }

  throw lastError ?? new GitHubError(fallbackMessage);
}

export async function listUserVisibleRepositories(octokit: Octokit): Promise<VisibleRepository[]> {
  const repos = await executeWithRetry(
    () =>
      octokit.paginate(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        affiliation: "owner,collaborator,organization_member",
      }),
    "Failed to list repositories for authenticated user"
  );

  return repos
    .filter((repo) => typeof repo.id === "number" && !!repo.owner?.login)
    .map((repo) => ({
      id: repo.id,
      owner: repo.owner!.login,
      name: repo.name,
    }));
}

export async function getRepositoryInstallation(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepositoryInstallation | null> {
  try {
    const response = await executeWithRetry(
      () => octokit.apps.getRepoInstallation({ owner, repo }),
      "Failed to fetch GitHub App installation for repository"
    );

    return {
      installationId: response.data.id,
    };
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "details" in error && typeof error.details === "object"
        ? ((error.details as Record<string, unknown>).status as number | undefined)
        : undefined;

    if (status === 404) {
      return null;
    }

    throw error;
  }
}
