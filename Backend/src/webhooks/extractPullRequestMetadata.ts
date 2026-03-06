import { WebhookError } from "../errors/WebhookError.js";

export interface PullRequestWebhookPayload {
  action?: string;
  installation?: { id?: number };
  repository?: {
    id?: number;
    name?: string;
    owner?: { login?: string };
  };
  pull_request?: {
    id?: number;
    number?: number;
    title?: string;
    state?: "open" | "closed";
    merged_at?: string | null;
    html_url?: string;
    user?: { login?: string };
    head?: { sha?: string };
    base?: { sha?: string };
  };
}

export interface PullRequestMetadata {
  action: string;
  pullRequestState: "open" | "closed";
  mergedAt: string | null;
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  headSha: string;
  baseSha: string;
  author?: string;
  htmlUrl?: string;
  repositoryId?: number;
  githubPrId?: number;
}

export function extractPullRequestMetadata(payload: PullRequestWebhookPayload): PullRequestMetadata {
  const pullRequest = payload.pull_request;
  const repository = payload.repository;
  const installation = payload.installation;

  if (
    !pullRequest?.number ||
    !pullRequest.title ||
    !pullRequest.state ||
    !pullRequest.head?.sha ||
    !pullRequest.base?.sha ||
    !repository?.name ||
    !repository.owner?.login ||
    !installation?.id ||
    !payload.action
  ) {
    throw new WebhookError("Invalid pull request payload", {
      hasPullRequest: Boolean(pullRequest),
      hasRepository: Boolean(repository),
      hasInstallation: Boolean(installation),
      action: payload.action,
    });
  }

  return {
    action: payload.action,
    pullRequestState: pullRequest.state,
    mergedAt: pullRequest.merged_at ?? null,
    installationId: installation.id,
    owner: repository.owner.login,
    repo: repository.name,
    pullNumber: pullRequest.number,
    title: pullRequest.title,
    headSha: pullRequest.head.sha,
    baseSha: pullRequest.base.sha,
    author: pullRequest.user?.login,
    htmlUrl: pullRequest.html_url,
    repositoryId: repository.id,
    githubPrId: pullRequest.id,
  };
}
