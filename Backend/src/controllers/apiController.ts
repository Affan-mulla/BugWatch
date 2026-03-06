import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";
import {
  getAvailableRepositories,
  getMetrics,
  getPullRequestDetail,
  getPullRequestDiff,
  getPullRequestIssues,
  getRepositories,
  getRepositoryPullRequests,
  getRepositorySettings,
  syncUserRepositories,
  updateRepositoryReviewState,
  updateRepositorySettings,
} from "../services/apiService.js";

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parsePositiveIntQueryParam(value: string | string[] | undefined): number | null {
  const parsedValue = asString(value);
  if (parsedValue === undefined) {
    return null;
  }

  if (!/^\d+$/.test(parsedValue)) {
    return Number.NaN;
  }

  const parsed = Number.parseInt(parsedValue, 10);
  return parsed > 0 ? parsed : Number.NaN;
}

function resolvePagination(query: Request["query"]):
  | { page: number; pageSize: number }
  | { error: { code: "BAD_REQUEST"; message: string } } {
  const parsedPage = parsePositiveIntQueryParam(query.page);
  const parsedPageSize = parsePositiveIntQueryParam(query.pageSize);

  if (Number.isNaN(parsedPage)) {
    return { error: { code: "BAD_REQUEST", message: "page must be a positive integer" } };
  }

  if (Number.isNaN(parsedPageSize)) {
    return { error: { code: "BAD_REQUEST", message: "pageSize must be a positive integer" } };
  }

  const page = parsedPage ?? 1;
  const pageSize = Math.min(100, parsedPageSize ?? 10);

  return { page, pageSize };
}

export async function listRepos(req: AuthenticatedRequest, res: Response): Promise<Response> {
  if (req.auth) {
    await syncUserRepositories(req.auth.githubAccessToken);
  }

  const pagination = resolvePagination(req.query);
  if ("error" in pagination) {
    return res.status(400).json({ error: pagination.error });
  }

  const repositories = await getRepositories(pagination);
  return res.status(200).json(repositories);
}

export async function listAvailableRepos(req: AuthenticatedRequest, res: Response): Promise<Response> {
  if (req.auth) {
    await syncUserRepositories(req.auth.githubAccessToken);
  }

  const pagination = resolvePagination(req.query);
  if ("error" in pagination) {
    return res.status(400).json({ error: pagination.error });
  }

  const repositories = await getAvailableRepositories(pagination);
  return res.status(200).json(repositories);
}

export async function listRepoPrs(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const repoId = toPositiveInt(asString(req.params.repoId), 0);
  if (!repoId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid repoId" } });
  }

  const page = toPositiveInt(typeof req.query.page === "string" ? req.query.page : undefined, 1);
  const pageSize = toPositiveInt(typeof req.query.pageSize === "string" ? req.query.pageSize : undefined, 10);
  const stateRaw = typeof req.query.state === "string" ? req.query.state : "open";
  const state = stateRaw === "open" || stateRaw === "closed" || stateRaw === "all" ? stateRaw : null;

  if (!state) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "state must be one of open, closed, all" } });
  }

  if (!req.auth?.githubAccessToken) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing authenticated session" } });
  }

  const response = await getRepositoryPullRequests(repoId, page, pageSize, req.auth.githubAccessToken, state);
  return res.status(200).json(response);
}

export async function getPr(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const prId = toPositiveInt(asString(req.params.prId), 0);
  if (!prId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid prId" } });
  }

  const response = await getPullRequestDetail(prId, req.auth?.githubAccessToken);
  return res.status(200).json(response);
}

export async function getPrIssues(req: Request, res: Response): Promise<Response> {
  const prId = toPositiveInt(asString(req.params.prId), 0);
  if (!prId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid prId" } });
  }

  const thresholdRaw = typeof req.query.threshold === "string" ? req.query.threshold : undefined;
  const threshold = thresholdRaw === "low" || thresholdRaw === "medium" || thresholdRaw === "high" ? thresholdRaw : undefined;

  const response = await getPullRequestIssues(prId, threshold);
  return res.status(200).json(response);
}

export async function getPrDiff(req: AuthenticatedRequest, res: Response): Promise<Response> {
  const prId = toPositiveInt(asString(req.params.prId), 0);
  if (!prId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid prId" } });
  }

  if (!req.auth?.githubAccessToken) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing authenticated session" } });
  }

  const response = await getPullRequestDiff(prId, req.auth.githubAccessToken);
  return res.status(200).json(response);
}

export async function patchRepoSettings(req: Request, res: Response): Promise<Response> {
  const repoId = toPositiveInt(asString(req.params.repoId), 0);
  if (!repoId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid repoId" } });
  }

  const payload = req.body as {
    enableSecurityRules?: boolean;
    enableLogicRules?: boolean;
    enablePatternRules?: boolean;
    enableAiExplanations?: boolean;
    severityThreshold?: "low" | "medium" | "high";
  };

  if (
    typeof payload.enableSecurityRules !== "boolean" ||
    typeof payload.enableLogicRules !== "boolean" ||
    typeof payload.enablePatternRules !== "boolean" ||
    typeof payload.enableAiExplanations !== "boolean" ||
    (payload.severityThreshold !== "low" && payload.severityThreshold !== "medium" && payload.severityThreshold !== "high")
  ) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid settings payload",
      },
    });
  }

  const response = await updateRepositorySettings(repoId, {
    enableSecurityRules: payload.enableSecurityRules,
    enableLogicRules: payload.enableLogicRules,
    enablePatternRules: payload.enablePatternRules,
    enableAiExplanations: payload.enableAiExplanations,
    severityThreshold: payload.severityThreshold,
  });
  return res.status(200).json(response);
}

export async function getRepoSettings(req: Request, res: Response): Promise<Response> {
  const repoId = toPositiveInt(asString(req.params.repoId), 0);
  if (!repoId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid repoId" } });
  }

  const response = await getRepositorySettings(repoId);
  return res.status(200).json(response);
}

export async function patchRepoReviewState(req: Request, res: Response): Promise<Response> {
  const repoId = toPositiveInt(asString(req.params.repoId), 0);
  if (!repoId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid repoId" } });
  }

  const body = req.body as { reviewEnabled?: boolean };
  if (typeof body.reviewEnabled !== "boolean") {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "reviewEnabled must be a boolean",
      },
    });
  }

  const response = await updateRepositoryReviewState(repoId, body.reviewEnabled);
  return res.status(200).json(response);
}

export async function getMetricsSummary(req: Request, res: Response): Promise<Response> {
  const repositoryIdRaw = typeof req.query.repositoryId === "string" ? req.query.repositoryId : undefined;
  const repositoryId = repositoryIdRaw ? toPositiveInt(repositoryIdRaw, 0) : undefined;
  const response = await getMetrics(repositoryId);
  return res.status(200).json(response);
}
