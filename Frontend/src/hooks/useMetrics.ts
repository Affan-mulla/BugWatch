import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";

export function useMetrics(repositoryId?: string) {
  const key = repositoryId ?? "global";
  const metrics = useAppStore((state) => state.metricsByRepository[key]);
  const loading = useAppStore((state) => state.loading.metrics);
  const error = useAppStore((state) => state.errors.metrics);
  const loadMetrics = useAppStore((state) => state.loadMetrics);

  useEffect(() => {
    void loadMetrics(repositoryId);
  }, [loadMetrics, repositoryId]);

  return {
    metrics,
    loading,
    error,
    refetch: () => loadMetrics(repositoryId, true),
  };
}
