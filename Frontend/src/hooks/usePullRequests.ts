import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import type { PullRequestListState } from "@/types/domain";

export function usePullRequests(repositoryId: string | null, page: number, pageSize: number, prState: PullRequestListState = "open") {
  const cacheKey = `${prState}:${page}`;
  const cache = useAppStore((state) => (repositoryId ? state.pullRequestsByRepository[repositoryId]?.[cacheKey] : undefined));
  const loading = useAppStore((state) => state.loading.pullRequests);
  const error = useAppStore((state) => state.errors.pullRequests);
  const loadPullRequests = useAppStore((state) => state.loadPullRequests);

  useEffect(() => {
    if (!repositoryId) return;
    void loadPullRequests(repositoryId, page, pageSize, prState);
  }, [loadPullRequests, page, pageSize, prState, repositoryId]);

  return {
    pageData: cache,
    pullRequests: cache?.data ?? [],
    loading,
    error,
    refetch: () => (repositoryId ? loadPullRequests(repositoryId, page, pageSize, prState, true) : Promise.resolve()),
  };
}
