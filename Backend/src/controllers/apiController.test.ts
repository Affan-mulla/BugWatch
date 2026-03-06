import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/apiService.js", () => ({
  getAvailableRepositories: vi.fn(),
  getMetrics: vi.fn(),
  getPullRequestDetail: vi.fn(),
  getPullRequestDiff: vi.fn(),
  getPullRequestIssues: vi.fn(),
  getRepositories: vi.fn(),
  getRepositoryPullRequests: vi.fn(),
  getRepositorySettings: vi.fn(),
  syncUserRepositories: vi.fn(),
  updateRepositoryReviewState: vi.fn(),
  updateRepositorySettings: vi.fn(),
}));

import { listAvailableRepos, listRepos } from "./apiController.js";
import { getAvailableRepositories, getRepositories, syncUserRepositories } from "../services/apiService.js";

const mockedGetRepositories = vi.mocked(getRepositories);
const mockedGetAvailableRepositories = vi.mocked(getAvailableRepositories);
const mockedSyncUserRepositories = vi.mocked(syncUserRepositories);

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe("apiController repository pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses default pagination for GET /api/repos", async () => {
    const req = { query: {}, auth: { githubAccessToken: "token" } } as any;
    const res = createResponseMock();

    mockedGetRepositories.mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    await listRepos(req, res as any);

    expect(mockedSyncUserRepositories).toHaveBeenCalledWith("token");
    expect(mockedGetRepositories).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("caps pageSize at 100 for GET /api/repos", async () => {
    const req = { query: { page: "2", pageSize: "999" } } as any;
    const res = createResponseMock();

    mockedGetRepositories.mockResolvedValue({
      data: [],
      page: 2,
      pageSize: 100,
      total: 0,
      totalPages: 1,
    });

    await listRepos(req, res as any);

    expect(mockedGetRepositories).toHaveBeenCalledWith({ page: 2, pageSize: 100 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when page is invalid for GET /api/repos", async () => {
    const req = { query: { page: "0" } } as any;
    const res = createResponseMock();

    await listRepos(req, res as any);

    expect(mockedGetRepositories).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST", message: "page must be a positive integer" },
    });
  });

  it("uses default pagination for GET /api/repos/available", async () => {
    const req = { query: {} } as any;
    const res = createResponseMock();

    mockedGetAvailableRepositories.mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    await listAvailableRepos(req, res as any);

    expect(mockedGetAvailableRepositories).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 400 when pageSize is invalid for GET /api/repos/available", async () => {
    const req = { query: { pageSize: "abc" } } as any;
    const res = createResponseMock();

    await listAvailableRepos(req, res as any);

    expect(mockedGetAvailableRepositories).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "BAD_REQUEST", message: "pageSize must be a positive integer" },
    });
  });
});
