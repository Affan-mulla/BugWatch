import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";

export function usePullRequestDetail(repositoryId: string | null, prId: string | null) {
  const key = repositoryId && prId ? `${repositoryId}:${prId}` : "";
  const detail = useAppStore((state) => (key ? state.pullRequestDetailByKey[key] : undefined));
  const loading = useAppStore((state) => state.loading);
  const errors = useAppStore((state) => state.errors);
  const loadPrMetadata = useAppStore((state) => state.loadPrMetadata);
  const loadPrIssues = useAppStore((state) => state.loadPrIssues);
  const loadPrDiff = useAppStore((state) => state.loadPrDiff);

  useEffect(() => {
    if (!repositoryId || !prId) return;
    void Promise.all([
      loadPrMetadata(repositoryId, prId),
      loadPrIssues(repositoryId, prId),
      loadPrDiff(repositoryId, prId),
    ]);
  }, [loadPrDiff, loadPrIssues, loadPrMetadata, prId, repositoryId]);

  return {
    metadata: detail?.metadata,
    issues: detail?.issues ?? [],
    diff: detail?.diff ?? [],
    loading,
    errors,
    refetchMetadata: () => (repositoryId && prId ? loadPrMetadata(repositoryId, prId, true) : Promise.resolve()),
    refetchIssues: () => (repositoryId && prId ? loadPrIssues(repositoryId, prId, undefined, true) : Promise.resolve()),
    refetchDiff: () => (repositoryId && prId ? loadPrDiff(repositoryId, prId, true) : Promise.resolve()),
  };
}
