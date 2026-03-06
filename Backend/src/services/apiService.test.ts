import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../github/auth.js", () => ({
  createUserOctokit: vi.fn(),
  createInstallationOctokit: vi.fn(),
}));

vi.mock("../github/pullRequestClient.js", () => ({
  listPullRequestFiles: vi.fn(),
  listRepositoryPullRequests: vi.fn(),
}));

vi.mock("../github/repositoryClient.js", () => ({
  listUserVisibleRepositories: vi.fn(),
}));

vi.mock("../repositories/repositoryRepository.js", () => ({
  repositoryRepository: {
    listAll: vi.fn(),
    findById: vi.fn(),
    upsert: vi.fn(),
    updateReviewState: vi.fn(),
    updateAccessMetadata: vi.fn(),
  },
}));

vi.mock("../repositories/prRepository.js", () => ({
  prRepository: {
    listByRepositoryId: vi.fn(),
    findById: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("../repositories/reviewRepository.js", () => ({
  reviewRepository: {
    findLatestByPullRequestId: vi.fn(),
    countByRepository: vi.fn(),
  },
}));

vi.mock("../repositories/issueRepository.js", () => ({
  issueRepository: {
    getSeverityTotals: vi.fn(),
    listByReviewRunId: vi.fn(),
    listTopRules: vi.fn(),
    listTrend: vi.fn(),
  },
}));

vi.mock("../repositories/settingsRepository.js", () => ({
  settingsRepository: {
    findByRepositoryId: vi.fn(),
    upsert: vi.fn(),
  },
}));

import {
  getAvailableRepositories,
  getRepositories,
  getRepositoryPullRequests,
  normalizePullRequestStatus,
  syncUserRepositories,
  updateRepositoryReviewState,
} from "./apiService.js";
import { createInstallationOctokit, createUserOctokit } from "../github/auth.js";
import { listUserVisibleRepositories } from "../github/repositoryClient.js";
import { listRepositoryPullRequests } from "../github/pullRequestClient.js";
import { repositoryRepository } from "../repositories/repositoryRepository.js";
import { prRepository } from "../repositories/prRepository.js";
import { reviewRepository } from "../repositories/reviewRepository.js";
import { issueRepository } from "../repositories/issueRepository.js";

const mockedCreateUserOctokit = vi.mocked(createUserOctokit);
const mockedCreateInstallationOctokit = vi.mocked(createInstallationOctokit);
const mockedListUserVisibleRepositories = vi.mocked(listUserVisibleRepositories);
const mockedListRepositoryPullRequests = vi.mocked(listRepositoryPullRequests);

const mockedRepositoryRepository = vi.mocked(repositoryRepository);
const mockedPrRepository = vi.mocked(prRepository);
const mockedReviewRepository = vi.mocked(reviewRepository);
const mockedIssueRepository = vi.mocked(issueRepository);

describe("apiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks all synced repositories as installed by default", async () => {
    mockedCreateUserOctokit.mockReturnValue({} as any);

    mockedListUserVisibleRepositories.mockResolvedValue([
      { id: 10, owner: "octo", name: "alpha" },
      { id: 11, owner: "octo", name: "beta" },
    ]);

    mockedRepositoryRepository.upsert
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockResolvedValueOnce({ id: 2 } as any);

    mockedRepositoryRepository.updateAccessMetadata.mockResolvedValue({ id: 1 } as any);

    await syncUserRepositories("token");

    expect(mockedRepositoryRepository.updateAccessMetadata).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        repositoryId: 1,
        installationStatus: "installed",
        installationId: null,
      })
    );
    expect(mockedRepositoryRepository.updateAccessMetadata).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        repositoryId: 2,
        installationStatus: "installed",
        installationId: null,
      })
    );
  });

  it("allows enabling review regardless of installation status", async () => {
    mockedRepositoryRepository.findById.mockResolvedValue({
      id: 5,
      owner: "octo",
      name: "alpha",
      reviewEnabled: false,
      installationStatus: "not_installed",
    } as any);

    mockedRepositoryRepository.updateReviewState.mockResolvedValue({
      id: 5,
      owner: "octo",
      name: "alpha",
      reviewEnabled: true,
      installationStatus: "not_installed",
      installationId: null,
      accessCheckedAt: null,
    } as any);
    mockedIssueRepository.getSeverityTotals.mockResolvedValue({ high: 0, medium: 0, low: 0 });
    mockedPrRepository.listByRepositoryId.mockResolvedValue({ total: 0, items: [] } as any);

    const updated = await updateRepositoryReviewState(5, true);

    expect(updated.reviewEnabled).toBe(true);
    expect(mockedRepositoryRepository.updateReviewState).toHaveBeenCalled();
  });

  it("returns repositories with reviewEnabled and installationStatus for frontend", async () => {
    mockedRepositoryRepository.listAll.mockResolvedValue([
      {
        id: 7,
        githubRepoId: 777,
        owner: "octo",
        name: "repo",
        reviewEnabled: true,
        installationStatus: "installed",
        installationId: 321,
        accessCheckedAt: "2026-02-26T00:00:00.000Z",
      },
    ] as any);

    mockedIssueRepository.getSeverityTotals.mockResolvedValue({ high: 2, medium: 1, low: 0 });
    mockedPrRepository.listByRepositoryId.mockResolvedValue({
      total: 1,
      items: [{ updatedAt: "2026-02-25T00:00:00.000Z" }],
    } as any);

    const repos = await getRepositories({ page: 1, pageSize: 10 });

    expect(repos).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repos.data[0]).toMatchObject({
      id: "7",
      reviewEnabled: true,
      installationStatus: "installed",
      installationId: "321",
      appAccessible: true,
      accessCheckedAt: "2026-02-26T00:00:00.000Z",
    });
  });

  it("returns only review-available repositories", async () => {
    mockedRepositoryRepository.listAll.mockResolvedValue([
      {
        id: 1,
        githubRepoId: 100,
        owner: "octo",
        name: "a",
        reviewEnabled: true,
        installationStatus: "installed",
        installationId: null,
        accessCheckedAt: null,
      },
      {
        id: 2,
        githubRepoId: 101,
        owner: "octo",
        name: "b",
        reviewEnabled: false,
        installationStatus: "installed",
        installationId: null,
        accessCheckedAt: null,
      },
    ] as any);

    mockedIssueRepository.getSeverityTotals.mockResolvedValue({ high: 0, medium: 0, low: 0 });
    mockedPrRepository.listByRepositoryId.mockResolvedValue({ total: 0, items: [] } as any);

    const repositories = await getAvailableRepositories({ page: 1, pageSize: 10 });
    expect(repositories).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(repositories.data).toHaveLength(1);
    expect(repositories.data[0]?.name).toBe("a");
  });

  it("paginates repositories and caps pageSize at 100", async () => {
    mockedRepositoryRepository.listAll.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) => ({
        id: index + 1,
        githubRepoId: 1000 + index,
        owner: "octo",
        name: `repo-${index + 1}`,
        reviewEnabled: true,
        installationStatus: "installed",
        installationId: null,
        accessCheckedAt: null,
      })) as any
    );

    mockedIssueRepository.getSeverityTotals.mockResolvedValue({ high: 0, medium: 0, low: 0 });
    mockedPrRepository.listByRepositoryId.mockResolvedValue({ total: 0, items: [] } as any);

    const repositories = await getRepositories({ page: 2, pageSize: 2 });
    expect(repositories).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 4,
      totalPages: 2,
    });
    expect(repositories.data).toHaveLength(2);
    expect(repositories.data[0]?.name).toBe("repo-3");

    const capped = await getRepositories({ page: 1, pageSize: 1000 });
    expect(capped.pageSize).toBe(100);
    expect(capped.totalPages).toBe(1);
  });

  it("lists real PRs with state filter and pagination, enriched with stored review counts", async () => {
    mockedRepositoryRepository.findById.mockResolvedValue({
      id: 9,
      owner: "octo",
      name: "repo",
      installationStatus: "not_installed",
      installationId: null,
    } as any);

    mockedCreateUserOctokit.mockReturnValue({} as any);

    mockedListRepositoryPullRequests.mockResolvedValue({
      total: 8,
      items: [
        {
          githubPrId: 1001,
          number: 42,
          title: "Fix A",
          author: "alice",
          state: "closed",
          mergedAt: "2026-02-20T00:00:00.000Z",
          headSha: "abcdef1234567890",
          baseSha: "1111111111111111",
          createdAt: "2026-02-19T00:00:00.000Z",
          updatedAt: "2026-02-20T00:00:00.000Z",
        },
      ],
    });

    mockedPrRepository.upsert.mockResolvedValue({ id: 55 } as any);
    mockedReviewRepository.findLatestByPullRequestId.mockResolvedValue({
      highCount: 3,
      mediumCount: 1,
      lowCount: 0,
    } as any);

    const response = await getRepositoryPullRequests(9, 2, 5, "token", "closed");

    expect(mockedListRepositoryPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ state: "closed", page: 2, pageSize: 5 })
    );
    expect(response.page).toBe(2);
    expect(response.pageSize).toBe(5);
    expect(response.total).toBe(8);
    expect(response.data[0]).toMatchObject({
      number: 42,
      status: "merged",
      issueCounts: { high: 3, medium: 1, low: 0 },
    });
  });

  it("normalizes PR status using merged and state values", () => {
    expect(normalizePullRequestStatus("open", null)).toBe("open");
    expect(normalizePullRequestStatus("closed", null)).toBe("closed");
    expect(normalizePullRequestStatus("closed", "2026-02-26T00:00:00.000Z")).toBe("merged");
  });

  it("prefers installation auth when installation is available for PR listing", async () => {
    mockedRepositoryRepository.findById.mockResolvedValue({
      id: 9,
      owner: "octo",
      name: "repo",
      installationStatus: "installed",
      installationId: 777,
    } as any);

    mockedCreateInstallationOctokit.mockResolvedValue({ marker: "installation" } as any);

    mockedListRepositoryPullRequests.mockResolvedValue({ total: 0, items: [] });

    await getRepositoryPullRequests(9, 1, 10, "token", "open");

    expect(mockedCreateInstallationOctokit).toHaveBeenCalledWith(777);
  });
});
