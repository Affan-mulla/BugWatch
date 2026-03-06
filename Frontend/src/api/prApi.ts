import { request } from "@/api/httpClient";
import type { PaginatedResponse } from "@/types/api";
import type { DiffFile, PullRequestIssue, PullRequestListState, PullRequestMetadata, PullRequestSummary, Severity } from "@/types/domain";

export async function fetchRepositoryPullRequests(
  repositoryId: string,
  page: number,
  pageSize: number,
  state: PullRequestListState = "open",
): Promise<PaginatedResponse<PullRequestSummary>> {
  return request<PaginatedResponse<PullRequestSummary>>(
    `/api/repos/${repositoryId}/prs?page=${page}&pageSize=${pageSize}&state=${state}`,
  );
}

export async function fetchPullRequestMetadata(prId: string): Promise<PullRequestMetadata> {
  return request<PullRequestMetadata>(`/api/pr/${prId}`);
}

export async function fetchPullRequestIssues(
  prId: string,
  severityThreshold?: Severity,
): Promise<PullRequestIssue[]> {
  const suffix = severityThreshold ? `?threshold=${severityThreshold}` : "";
  return request<PullRequestIssue[]>(`/api/pr/${prId}/issues${suffix}`);
}

export async function fetchPullRequestDiff(prId: string): Promise<DiffFile[]> {
  return request<DiffFile[]>(`/api/pr/${prId}/diff`);
}
