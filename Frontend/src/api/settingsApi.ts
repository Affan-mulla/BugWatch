import { request } from "@/api/httpClient";
import type { RepositorySettings } from "@/types/domain";

export async function fetchRepositorySettings(repositoryId: string): Promise<RepositorySettings> {
  return request<RepositorySettings>(`/api/repos/${repositoryId}/settings`);
}

export async function saveRepositorySettings(
  repositoryId: string,
  settings: RepositorySettings,
): Promise<RepositorySettings> {
  return request<RepositorySettings>(`/api/repos/${repositoryId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}
