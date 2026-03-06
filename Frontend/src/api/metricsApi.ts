import { request } from "@/api/httpClient";
import type { MetricsSummary } from "@/types/domain";

export async function fetchMetrics(repositoryId?: string): Promise<MetricsSummary> {
  const query = repositoryId ? `?repositoryId=${repositoryId}` : "";
  return request<MetricsSummary>(`/api/metrics${query}`);
}
