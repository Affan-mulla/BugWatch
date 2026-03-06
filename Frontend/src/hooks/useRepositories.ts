import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";

export function useRepositories() {
  const repositories = useAppStore((state) => state.repositories);
  const availableRepositories = useAppStore((state) => state.availableRepositories);
  const selectedRepositoryId = useAppStore((state) => state.selectedRepositoryId);
  const loading = useAppStore((state) => state.loading.repositories);
  const error = useAppStore((state) => state.errors.repositories);
  const loadRepositories = useAppStore((state) => state.loadRepositories);
  const loadAvailableRepositories = useAppStore((state) => state.loadAvailableRepositories);
  const toggleRepositoryReviewState = useAppStore((state) => state.toggleRepositoryReviewState);
  const selectRepository = useAppStore((state) => state.selectRepository);

  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  return {
    repositories,
    availableRepositories,
    selectedRepositoryId,
    loading,
    error,
    selectRepository,
    toggleRepositoryReviewState,
    refetch: () => loadRepositories(true),
    refetchAvailable: () => loadAvailableRepositories(true),
  };
}
