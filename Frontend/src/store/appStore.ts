import { create } from "zustand";
import type { PaginatedResponse } from "@/types/api";
import type {
  DiffFile,
  MetricsSummary,
  PullRequestIssue,
  PullRequestListState,
  PullRequestMetadata,
  PullRequestSummary,
  Repository,
  RepositorySettings,
  Severity,
} from "@/types/domain";
import { fetchAvailableRepositories, fetchRepositories, updateRepositoryReviewState } from "@/api/repoApi";
import {
  fetchPullRequestDiff,
  fetchPullRequestIssues,
  fetchPullRequestMetadata,
  fetchRepositoryPullRequests,
} from "@/api/prApi";
import { fetchMetrics } from "@/api/metricsApi";
import { fetchRepositorySettings, saveRepositorySettings } from "@/api/settingsApi";

interface PullRequestDetailCache {
  metadata?: PullRequestMetadata;
  issues?: PullRequestIssue[];
  diff?: DiffFile[];
}

interface LoadingState {
  repositories: boolean;
  pullRequests: boolean;
  prMetadata: boolean;
  prIssues: boolean;
  prDiff: boolean;
  metrics: boolean;
  settings: boolean;
}

interface ErrorState {
  repositories: string | null;
  pullRequests: string | null;
  prMetadata: string | null;
  prIssues: string | null;
  prDiff: string | null;
  metrics: string | null;
  settings: string | null;
}

interface AppState {
  repositories: Repository[];
  availableRepositories: Repository[];
  selectedRepositoryId: string | null;
  selectedPrNumber: number | null;
  pullRequestsByRepository: Record<string, Record<string, PaginatedResponse<PullRequestSummary>>>;
  pullRequestDetailByKey: Record<string, PullRequestDetailCache>;
  metricsByRepository: Record<string, MetricsSummary>;
  settingsByRepository: Record<string, RepositorySettings>;
  loading: LoadingState;
  errors: ErrorState;

  selectRepository: (repositoryId: string | null) => void;
  selectPr: (prNumber: number | null) => void;
  clearError: (key: keyof ErrorState) => void;

  loadRepositories: (force?: boolean) => Promise<void>;
  loadAvailableRepositories: (force?: boolean) => Promise<void>;
  toggleRepositoryReviewState: (repositoryId: string, reviewEnabled: boolean) => Promise<void>;

  loadPullRequests: (
    repositoryId: string,
    page: number,
    pageSize: number,
    state?: PullRequestListState,
    force?: boolean,
  ) => Promise<void>;

  loadPrMetadata: (repositoryId: string, prId: string, force?: boolean) => Promise<void>;
  loadPrIssues: (repositoryId: string, prId: string, severityThreshold?: Severity, force?: boolean) => Promise<void>;
  loadPrDiff: (repositoryId: string, prId: string, force?: boolean) => Promise<void>;

  loadMetrics: (repositoryId?: string, force?: boolean) => Promise<void>;
  loadSettings: (repositoryId: string, force?: boolean) => Promise<void>;
  saveSettings: (repositoryId: string, settings: RepositorySettings) => Promise<void>;
}

function withError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getPrKey(repositoryId: string, prId: string): string {
  return `${repositoryId}:${prId}`;
}

function getPullRequestCacheKey(state: PullRequestListState, page: number): string {
  return `${state}:${page}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  repositories: [],
  availableRepositories: [],
  selectedRepositoryId: null,
  selectedPrNumber: null,
  pullRequestsByRepository: {},
  pullRequestDetailByKey: {},
  metricsByRepository: {},
  settingsByRepository: {},
  loading: {
    repositories: false,
    pullRequests: false,
    prMetadata: false,
    prIssues: false,
    prDiff: false,
    metrics: false,
    settings: false,
  },
  errors: {
    repositories: null,
    pullRequests: null,
    prMetadata: null,
    prIssues: null,
    prDiff: null,
    metrics: null,
    settings: null,
  },

  selectRepository: (repositoryId) => set({ selectedRepositoryId: repositoryId }),
  selectPr: (prNumber) => set({ selectedPrNumber: prNumber }),

  clearError: (key) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [key]: null,
      },
    })),

  loadRepositories: async (force = false) => {
    const { repositories } = get();
    if (!force && repositories.length > 0) return;

    set((state) => ({
      loading: { ...state.loading, repositories: true },
      errors: { ...state.errors, repositories: null },
    }));

    try {
      const data = await fetchRepositories();
      const availableRepositories = data.filter((repo) => repo.reviewEnabled && repo.appAccessible);
      set((state) => ({
        repositories: data,
        availableRepositories,
        selectedRepositoryId: state.selectedRepositoryId ?? availableRepositories[0]?.id ?? data[0]?.id ?? null,
        loading: { ...state.loading, repositories: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, repositories: false },
        errors: { ...state.errors, repositories: withError(error, "Failed to load repositories") },
      }));
    }
  },

  loadAvailableRepositories: async (force = false) => {
    const { availableRepositories } = get();
    if (!force && availableRepositories.length > 0) return;

    set((state) => ({
      loading: { ...state.loading, repositories: true },
      errors: { ...state.errors, repositories: null },
    }));

    try {
      const data = await fetchAvailableRepositories();
      set((state) => ({
        availableRepositories: data,
        selectedRepositoryId: state.selectedRepositoryId ?? data[0]?.id ?? null,
        loading: { ...state.loading, repositories: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, repositories: false },
        errors: { ...state.errors, repositories: withError(error, "Failed to load available repositories") },
      }));
    }
  },

  toggleRepositoryReviewState: async (repositoryId, reviewEnabled) => {
    const previousRepositories = get().repositories;
    const previousAvailableRepositories = get().availableRepositories;
    const previousSelectedRepositoryId = get().selectedRepositoryId;

    set((state) => ({
      repositories: state.repositories.map((repo) =>
        repo.id === repositoryId ? { ...repo, reviewEnabled } : repo,
      ),
    }));

    try {
      const updatedRepository = await updateRepositoryReviewState(repositoryId, reviewEnabled);
      set((state) => ({
        repositories: state.repositories.map((repo) => (repo.id === repositoryId ? updatedRepository : repo)),
        availableRepositories: state.availableRepositories
          .map((repo) => (repo.id === repositoryId ? updatedRepository : repo))
          .filter((repo) => repo.reviewEnabled && repo.appAccessible),
        selectedRepositoryId:
          state.selectedRepositoryId === repositoryId && !updatedRepository.reviewEnabled
            ? state.availableRepositories
                .map((repo) => (repo.id === repositoryId ? updatedRepository : repo))
                .filter((repo) => repo.reviewEnabled && repo.appAccessible)[0]?.id ?? null
            : state.selectedRepositoryId,
      }));
    } catch {
      set({
        repositories: previousRepositories,
        availableRepositories: previousAvailableRepositories,
        selectedRepositoryId: previousSelectedRepositoryId,
      });
      throw new Error("Failed to update repository review state");
    }
  },

  loadPullRequests: async (repositoryId, page, pageSize, state = "open", force = false) => {
    const repositoryCache = get().pullRequestsByRepository[repositoryId] ?? {};
    const cacheKey = getPullRequestCacheKey(state, page);
    if (!force && repositoryCache[cacheKey]) return;

    set((state) => ({
      loading: { ...state.loading, pullRequests: true },
      errors: { ...state.errors, pullRequests: null },
    }));

    try {
      const data = await fetchRepositoryPullRequests(repositoryId, page, pageSize, state);
      set((state) => ({
        pullRequestsByRepository: {
          ...state.pullRequestsByRepository,
          [repositoryId]: {
            ...(state.pullRequestsByRepository[repositoryId] ?? {}),
            [cacheKey]: data,
          },
        },
        loading: { ...state.loading, pullRequests: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, pullRequests: false },
        errors: { ...state.errors, pullRequests: withError(error, "Failed to load pull requests") },
      }));
    }
  },

  loadPrMetadata: async (repositoryId, prId, force = false) => {
    const key = getPrKey(repositoryId, prId);
    const cached = get().pullRequestDetailByKey[key]?.metadata;
    if (!force && cached) return;

    set((state) => ({
      loading: { ...state.loading, prMetadata: true },
      errors: { ...state.errors, prMetadata: null },
    }));

    try {
      const data = await fetchPullRequestMetadata(prId);
      set((state) => ({
        pullRequestDetailByKey: {
          ...state.pullRequestDetailByKey,
          [key]: {
            ...(state.pullRequestDetailByKey[key] ?? {}),
            metadata: data,
          },
        },
        loading: { ...state.loading, prMetadata: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, prMetadata: false },
        errors: { ...state.errors, prMetadata: withError(error, "Failed to load PR metadata") },
      }));
    }
  },

  loadPrIssues: async (repositoryId, prId, severityThreshold, force = false) => {
    const key = getPrKey(repositoryId, prId);
    const cached = get().pullRequestDetailByKey[key]?.issues;
    if (!force && cached) return;

    set((state) => ({
      loading: { ...state.loading, prIssues: true },
      errors: { ...state.errors, prIssues: null },
    }));

    try {
      const data = await fetchPullRequestIssues(prId, severityThreshold);
      set((state) => ({
        pullRequestDetailByKey: {
          ...state.pullRequestDetailByKey,
          [key]: {
            ...(state.pullRequestDetailByKey[key] ?? {}),
            issues: data,
          },
        },
        loading: { ...state.loading, prIssues: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, prIssues: false },
        errors: { ...state.errors, prIssues: withError(error, "Failed to load PR issues") },
      }));
    }
  },

  loadPrDiff: async (repositoryId, prId, force = false) => {
    const key = getPrKey(repositoryId, prId);
    const cached = get().pullRequestDetailByKey[key]?.diff;
    if (!force && cached) return;

    set((state) => ({
      loading: { ...state.loading, prDiff: true },
      errors: { ...state.errors, prDiff: null },
    }));

    try {
      const data = await fetchPullRequestDiff(prId);
      set((state) => ({
        pullRequestDetailByKey: {
          ...state.pullRequestDetailByKey,
          [key]: {
            ...(state.pullRequestDetailByKey[key] ?? {}),
            diff: data,
          },
        },
        loading: { ...state.loading, prDiff: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, prDiff: false },
        errors: { ...state.errors, prDiff: withError(error, "Failed to load PR diff") },
      }));
    }
  },

  loadMetrics: async (repositoryId, force = false) => {
    const key = repositoryId ?? "global";
    if (!force && get().metricsByRepository[key]) return;

    set((state) => ({
      loading: { ...state.loading, metrics: true },
      errors: { ...state.errors, metrics: null },
    }));

    try {
      const data = await fetchMetrics(repositoryId);
      set((state) => ({
        metricsByRepository: {
          ...state.metricsByRepository,
          [key]: data,
        },
        loading: { ...state.loading, metrics: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, metrics: false },
        errors: { ...state.errors, metrics: withError(error, "Failed to load metrics") },
      }));
    }
  },

  loadSettings: async (repositoryId, force = false) => {
    if (!force && get().settingsByRepository[repositoryId]) return;

    set((state) => ({
      loading: { ...state.loading, settings: true },
      errors: { ...state.errors, settings: null },
    }));

    try {
      const data = await fetchRepositorySettings(repositoryId);
      set((state) => ({
        settingsByRepository: {
          ...state.settingsByRepository,
          [repositoryId]: data,
        },
        loading: { ...state.loading, settings: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, settings: false },
        errors: { ...state.errors, settings: withError(error, "Failed to load settings") },
      }));
    }
  },

  saveSettings: async (repositoryId, settings) => {
    set((state) => ({
      loading: { ...state.loading, settings: true },
      errors: { ...state.errors, settings: null },
    }));

    try {
      const data = await saveRepositorySettings(repositoryId, settings);
      set((state) => ({
        settingsByRepository: {
          ...state.settingsByRepository,
          [repositoryId]: data,
        },
        loading: { ...state.loading, settings: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, settings: false },
        errors: { ...state.errors, settings: withError(error, "Failed to save settings") },
      }));
      throw error;
    }
  },
}));
