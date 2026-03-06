import { createInstallationOctokit, createUserOctokit } from "../github/auth.js";
import { listPullRequestFiles, listRepositoryPullRequests, type PullRequestStateFilter } from "../github/pullRequestClient.js";
import { listUserVisibleRepositories } from "../github/repositoryClient.js";
import { repositoryRepository } from "../repositories/repositoryRepository.js";
import { prRepository } from "../repositories/prRepository.js";
import { reviewRepository } from "../repositories/reviewRepository.js";
import { issueRepository } from "../repositories/issueRepository.js";
import { settingsRepository } from "../repositories/settingsRepository.js";
import { AuthError } from "../errors/AuthError.js";

export interface ApiRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  reviewEnabled: boolean;
  installationStatus: "installed" | "not_installed";
  installationId: string | null;
  accessCheckedAt: string | null;
  appAccessible: boolean;
  lastAnalyzedAt: string | null;
  issueCounts: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ApiPullRequestSummary {
  id: string;
  number: number;
  title: string;
  status: "open" | "closed" | "merged";
  author: string;
  branch: string;
  updatedAt: string;
  issueCounts: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface ApiPullRequestDetail extends ApiPullRequestSummary {
  createdAt: string;
  filesChanged: number;
  commits: number;
  additions: number;
  deletions: number;
}

export interface ApiIssue {
  id: string;
  filePath: string;
  lineNumber: number;
  rule: string;
  severity: "low" | "medium" | "high";
  deterministicReason: string;
  aiExplanation: string;
  suggestedFix: string;
}

export interface ApiDiffLine {
  type: "context" | "added" | "removed";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface ApiDiffFile {
  path: string;
  language: string;
  lines: ApiDiffLine[];
}

function inferLanguage(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "text";
}

function parsePatchToLines(patch: string): ApiDiffLine[] {
  const rows = patch.split("\n");
  let oldLine = 0;
  let newLine = 0;
  const lines: ApiDiffLine[] = [];

  for (const row of rows) {
    if (row.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      continue;
    }

    if (row.startsWith("+")) {
      lines.push({ type: "added", oldLineNumber: null, newLineNumber: newLine, content: row.slice(1) });
      newLine += 1;
      continue;
    }

    if (row.startsWith("-")) {
      lines.push({ type: "removed", oldLineNumber: oldLine, newLineNumber: null, content: row.slice(1) });
      oldLine += 1;
      continue;
    }

    if (row.startsWith("\\ No newline at end of file")) {
      continue;
    }

    lines.push({ type: "context", oldLineNumber: oldLine, newLineNumber: newLine, content: row.startsWith(" ") ? row.slice(1) : row });
    oldLine += 1;
    newLine += 1;
  }

  return lines;
}

export function normalizePullRequestStatus(rawState: string, mergedAt: string | null): "open" | "closed" | "merged" {
  if (mergedAt) {
    return "merged";
  }

  if (rawState === "closed") {
    return "closed";
  }

  return "open";
}

function paginateArray<T>(items: T[], options: PaginationOptions): Paginated<T> {
  const safePage = Math.max(1, options.page);
  const safePageSize = Math.max(1, Math.min(100, options.pageSize));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const startIndex = (safePage - 1) * safePageSize;
  const data = items.slice(startIndex, startIndex + safePageSize);

  return {
    data,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

async function toApiRepository(repo: {
  id: number;
  owner: string;
  name: string;
  reviewEnabled: boolean;
  installationStatus: "installed" | "not_installed";
  installationId: number | null;
  accessCheckedAt: string | null;
}): Promise<ApiRepository> {
  const issueCounts = await issueRepository.getSeverityTotals(repo.id);
  const prPage = await prRepository.listByRepositoryId(repo.id, 1, 1);
  const lastAnalyzedAt = prPage.items[0]?.updatedAt ?? null;

  return {
    id: String(repo.id),
    owner: repo.owner,
    name: repo.name,
    fullName: `${repo.owner}/${repo.name}`,
    reviewEnabled: repo.reviewEnabled,
    installationStatus: repo.installationStatus,
    installationId: repo.installationId ? String(repo.installationId) : null,
    accessCheckedAt: repo.accessCheckedAt,
    appAccessible: repo.installationStatus === "installed",
    lastAnalyzedAt,
    issueCounts,
  };
}

export async function getRepositories(options: PaginationOptions): Promise<Paginated<ApiRepository>> {
  const repositories = await repositoryRepository.listAll();
  const paged = paginateArray(repositories, options);
  const data = await Promise.all(paged.data.map((repo) => toApiRepository(repo)));

  return {
    data,
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    totalPages: paged.totalPages,
  };
}

export async function getAvailableRepositories(options: PaginationOptions): Promise<Paginated<ApiRepository>> {
  const repositories = await repositoryRepository.listAll();
  const availableRepositories = repositories.filter(
    (repository) => repository.reviewEnabled && repository.installationStatus === "installed"
  );
  const paged = paginateArray(availableRepositories, options);
  const data = await Promise.all(paged.data.map((repo) => toApiRepository(repo)));

  return {
    data,
    page: paged.page,
    pageSize: paged.pageSize,
    total: paged.total,
    totalPages: paged.totalPages,
  };
}

export async function getRepositoryPullRequests(
  repositoryId: number,
  page: number,
  pageSize: number,
  githubAccessToken: string,
  state: PullRequestStateFilter = "open"
): Promise<Paginated<ApiPullRequestSummary>> {
  const repository = await repositoryRepository.findById(repositoryId);
  if (!repository) {
    throw new AuthError("Repository not found", 404);
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));

  let octokit = createUserOctokit(githubAccessToken);

  if (repository.installationStatus === "installed" && repository.installationId) {
    try {
      octokit = await createInstallationOctokit(repository.installationId);
    } catch {
      octokit = createUserOctokit(githubAccessToken);
    }
  }

  const result = await listRepositoryPullRequests({
    octokit,
    owner: repository.owner,
    repo: repository.name,
    state,
    page: safePage,
    pageSize: safePageSize,
  });

  const data: ApiPullRequestSummary[] = [];

  for (const pr of result.items) {
    const storedPr = await prRepository.upsert({
      repositoryId,
      githubPrId: pr.githubPrId,
      number: pr.number,
      title: pr.title,
      author: pr.author,
      status: pr.state,
      headSha: pr.headSha,
      baseSha: pr.baseSha,
      mergedAt: pr.mergedAt,
    });

    const reviewRun = await reviewRepository.findLatestByPullRequestId(storedPr.id);
    data.push({
      id: String(storedPr.id),
      number: pr.number,
      title: pr.title,
      status: normalizePullRequestStatus(pr.state, pr.mergedAt),
      author: pr.author,
      branch: pr.headSha.slice(0, 12),
      updatedAt: pr.updatedAt,
      issueCounts: {
        high: reviewRun?.highCount ?? 0,
        medium: reviewRun?.mediumCount ?? 0,
        low: reviewRun?.lowCount ?? 0,
      },
    });
  }

  return {
    data,
    page: safePage,
    pageSize: safePageSize,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / safePageSize)),
  };
}

export async function getPullRequestDetail(prId: number, githubAccessToken?: string): Promise<ApiPullRequestDetail> {
  const pr = await prRepository.findById(prId);
  if (!pr) {
    throw new AuthError("Pull request not found", 404);
  }

  const reviewRun = await reviewRepository.findLatestByPullRequestId(pr.id);

  let filesChanged = 0;
  let additions = 0;
  let deletions = 0;

  if (githubAccessToken) {
    const repository = await repositoryRepository.findById(pr.repositoryId);
    if (repository) {
      try {
        const octokit = createUserOctokit(githubAccessToken);
        const files = await listPullRequestFiles({
          octokit,
          owner: repository.owner,
          repo: repository.name,
          pullNumber: pr.number,
        });

        filesChanged = files.length;
        additions = files.reduce((total, file) => total + file.additions, 0);
        deletions = files.reduce((total, file) => total + file.deletions, 0);
      } catch {
        filesChanged = 0;
        additions = 0;
        deletions = 0;
      }
    }
  }

  return {
    id: String(pr.id),
    number: pr.number,
    title: pr.title,
    status: normalizePullRequestStatus(pr.status, pr.mergedAt),
    author: pr.author,
    branch: pr.headSha.slice(0, 12),
    updatedAt: pr.updatedAt,
    issueCounts: {
      high: reviewRun?.highCount ?? 0,
      medium: reviewRun?.mediumCount ?? 0,
      low: reviewRun?.lowCount ?? 0,
    },
    createdAt: pr.createdAt,
    filesChanged,
    commits: 1,
    additions,
    deletions,
  };
}

export async function getPullRequestIssues(prId: number, threshold?: "low" | "medium" | "high"): Promise<ApiIssue[]> {
  const pr = await prRepository.findById(prId);
  if (!pr) {
    throw new AuthError("Pull request not found", 404);
  }

  const reviewRun = await reviewRepository.findLatestByPullRequestId(pr.id);
  if (!reviewRun) {
    return [];
  }

  const issues = await issueRepository.listByReviewRunId(reviewRun.id, threshold);
  return issues.map((issue) => ({
    id: String(issue.id),
    filePath: issue.filePath,
    lineNumber: issue.lineNumber,
    rule: issue.ruleName,
    severity: issue.severity,
    deterministicReason: issue.ruleExplanation ?? "Rule violated",
    aiExplanation: issue.aiExplanation ?? issue.ruleExplanation ?? "No AI explanation available",
    suggestedFix: issue.suggestedFix ?? "Follow the rule guidance and refactor accordingly.",
  }));
}

export async function getPullRequestDiff(prId: number, githubAccessToken: string): Promise<ApiDiffFile[]> {
  const pr = await prRepository.findById(prId);
  if (!pr) {
    throw new AuthError("Pull request not found", 404);
  }

  const repository = await repositoryRepository.findById(pr.repositoryId);
  if (!repository) {
    throw new AuthError("Repository not found", 404);
  }

  const octokit = createUserOctokit(githubAccessToken);
  const files = await listPullRequestFiles({
    octokit,
    owner: repository.owner,
    repo: repository.name,
    pullNumber: pr.number,
  });

  return files.map((file) => ({
    path: file.filename,
    language: inferLanguage(file.filename),
    lines: parsePatchToLines(file.patch ?? ""),
  }));
}

export async function getRepositorySettings(repositoryId: number): Promise<{
  enableSecurityRules: boolean;
  enableLogicRules: boolean;
  enablePatternRules: boolean;
  enableAiExplanations: boolean;
  severityThreshold: "low" | "medium" | "high";
}> {
  const repository = await repositoryRepository.findById(repositoryId);
  if (!repository) {
    throw new AuthError("Repository not found", 404);
  }

  const settings = await settingsRepository.findByRepositoryId(repositoryId);
  if (!settings) {
    return {
      enableSecurityRules: true,
      enableLogicRules: true,
      enablePatternRules: true,
      enableAiExplanations: true,
      severityThreshold: "medium",
    };
  }

  return {
    enableSecurityRules: settings.securityRulesEnabled,
    enableLogicRules: settings.logicRulesEnabled,
    enablePatternRules: true,
    enableAiExplanations: settings.aiEnabled,
    severityThreshold: settings.severityThreshold,
  };
}

export async function updateRepositorySettings(
  repositoryId: number,
  payload: {
    enableSecurityRules: boolean;
    enableLogicRules: boolean;
    enablePatternRules: boolean;
    enableAiExplanations: boolean;
    severityThreshold: "low" | "medium" | "high";
  }
): Promise<{
  enableSecurityRules: boolean;
  enableLogicRules: boolean;
  enablePatternRules: boolean;
  enableAiExplanations: boolean;
  severityThreshold: "low" | "medium" | "high";
}> {
  const repository = await repositoryRepository.findById(repositoryId);
  if (!repository) {
    throw new AuthError("Repository not found", 404);
  }

  const updated = await settingsRepository.upsert({
    repositoryId,
    securityRulesEnabled: payload.enableSecurityRules,
    logicRulesEnabled: payload.enableLogicRules,
    aiEnabled: payload.enableAiExplanations,
    severityThreshold: payload.severityThreshold,
  });

  return {
    enableSecurityRules: updated.securityRulesEnabled,
    enableLogicRules: updated.logicRulesEnabled,
    enablePatternRules: payload.enablePatternRules,
    enableAiExplanations: updated.aiEnabled,
    severityThreshold: updated.severityThreshold,
  };
}

export async function updateRepositoryReviewState(repositoryId: number, reviewEnabled: boolean): Promise<ApiRepository> {
  const existing = await repositoryRepository.findById(repositoryId);
  if (!existing) {
    throw new AuthError("Repository not found", 404);
  }

  const updated = await repositoryRepository.updateReviewState({ repositoryId, reviewEnabled });
  if (!updated) {
    throw new AuthError("Repository not found", 404);
  }

  const issueCounts = await issueRepository.getSeverityTotals(updated.id);
  const prPage = await prRepository.listByRepositoryId(updated.id, 1, 1);

  return {
    id: String(updated.id),
    owner: updated.owner,
    name: updated.name,
    fullName: `${updated.owner}/${updated.name}`,
    reviewEnabled: updated.reviewEnabled,
    installationStatus: updated.installationStatus,
    installationId: updated.installationId ? String(updated.installationId) : null,
    accessCheckedAt: updated.accessCheckedAt,
    appAccessible: updated.installationStatus === "installed",
    lastAnalyzedAt: prPage.items[0]?.updatedAt ?? null,
    issueCounts,
  };
}

export async function getMetrics(repositoryId?: number): Promise<{
  totalPrsAnalyzed: number;
  totalIssues: number;
  mostViolatedRule: string;
  severityDistribution: { high: number; medium: number; low: number };
  trend: Array<{ date: string; high: number; medium: number; low: number }>;
  topRules: Array<{ rule: string; count: number; severity: "low" | "medium" | "high" }>;
}> {
  if (repositoryId) {
    const repository = await repositoryRepository.findById(repositoryId);
    if (!repository) {
      throw new AuthError("Repository not found", 404);
    }
  }

  const totalPrsAnalyzed = await reviewRepository.countByRepository(repositoryId);
  const severityDistribution = await issueRepository.getSeverityTotals(repositoryId);
  const topRules = await issueRepository.listTopRules(repositoryId, 5);
  const trend = await issueRepository.listTrend(repositoryId);

  return {
    totalPrsAnalyzed,
    totalIssues: severityDistribution.high + severityDistribution.medium + severityDistribution.low,
    mostViolatedRule: topRules[0]?.rule ?? "none",
    severityDistribution,
    trend,
    topRules,
  };
}

export async function syncUserRepositories(githubAccessToken: string): Promise<void> {
  const octokit = createUserOctokit(githubAccessToken);
  const repos = await listUserVisibleRepositories(octokit);
  const checkedAt = new Date().toISOString();

  for (const repo of repos) {
    const repository = await repositoryRepository.upsert({
      githubRepoId: repo.id,
      owner: repo.owner,
      name: repo.name,
    });

    await repositoryRepository.updateAccessMetadata({
      repositoryId: repository.id,
      installationStatus: "installed",
      installationId: null,
      accessCheckedAt: checkedAt,
    });
  }
}
