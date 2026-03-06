import { request } from "@/api/httpClient";
import type { Repository } from "@/types/domain";

export async function fetchRepositories(): Promise<Repository[]> {
  return request<Repository[]>("/api/repos");
}

export async function fetchAvailableRepositories(): Promise<Repository[]> {
  return request<Repository[]>("/api/repos/available");
}

export async function updateRepositoryReviewState(repositoryId: string, reviewEnabled: boolean): Promise<Repository> {
  return request<Repository>(`/api/repos/${repositoryId}/review-state`, {
    method: "PATCH",
    body: JSON.stringify({ reviewEnabled }),
  });
}
