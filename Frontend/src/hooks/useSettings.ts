import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import type { RepositorySettings } from "@/types/domain";

export function useSettings(repositoryId: string) {
  const settings = useAppStore((state) => state.settingsByRepository[repositoryId]);
  const loading = useAppStore((state) => state.loading.settings);
  const error = useAppStore((state) => state.errors.settings);
  const loadSettings = useAppStore((state) => state.loadSettings);
  const saveSettings = useAppStore((state) => state.saveSettings);

  useEffect(() => {
    void loadSettings(repositoryId);
  }, [loadSettings, repositoryId]);

  return {
    settings,
    loading,
    error,
    saveSettings: (next: RepositorySettings) => saveSettings(repositoryId, next),
    refetch: () => loadSettings(repositoryId, true),
  };
}
