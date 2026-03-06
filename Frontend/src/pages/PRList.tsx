import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { GitPullRequest, GitMerge, GitPullRequestClosed, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePullRequests } from "@/hooks/usePullRequests";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatRelativeDate } from "@/utils/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PullRequestListState } from "@/types/domain";
import { useRepositories } from "@/hooks/useRepositories";

export function PRList() {
  const { id } = useParams<{ id: string }>();
  const { availableRepositories, selectedRepositoryId, selectRepository, refetchAvailable } = useRepositories();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [prState, setPrState] = useState<PullRequestListState>("open");
  const pageSize = 10;
  const fallbackRepositoryId = availableRepositories[0]?.id ?? null;
  const repositoryId = id ?? selectedRepositoryId ?? fallbackRepositoryId;
  const debouncedQuery = useDebouncedValue(query, 250);
  const isRepositoryAvailable = repositoryId
    ? availableRepositories.some((repository) => repository.id === repositoryId)
    : false;

  useEffect(() => {
    void refetchAvailable();
  }, [refetchAvailable]);

  useEffect(() => {
    if (!selectedRepositoryId && fallbackRepositoryId) {
      selectRepository(fallbackRepositoryId);
    }
  }, [fallbackRepositoryId, selectRepository, selectedRepositoryId]);

  const { pullRequests, pageData, loading, error, refetch } = usePullRequests(repositoryId, page, pageSize, prState);

  const filteredPullRequests = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return pullRequests;
    return pullRequests.filter(
      (pr) => pr.title.toLowerCase().includes(normalized) || `${pr.number}`.includes(normalized),
    );
  }, [debouncedQuery, pullRequests]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pull Requests</h1>
        <div className="flex items-center space-x-2">
          <Select
            value={prState}
            onValueChange={(value: PullRequestListState) => {
              setPrState(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="PR state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search PRs..."
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      {!repositoryId ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No review-available repositories yet. Enable review for a repository in Dashboard.
        </Card>
      ) : null}

      {repositoryId && !isRepositoryAvailable ? (
        <Card className="p-6 text-sm text-muted-foreground">
          This repository is not currently review-available. Enable review in Dashboard first.
        </Card>
      ) : null}

      {repositoryId && isRepositoryAvailable ? <Card>
        {loading ? (
          <div className="p-4">
            <LoadingSkeleton rows={8} />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {filteredPullRequests.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No pull requests found for this repository.
                </div>
              ) : null}
              {filteredPullRequests.map((pr) => (
                <div key={pr.id} className="flex items-start justify-between p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {pr.status === "open" && <GitPullRequest className="h-5 w-5 text-primary" />}
                      {pr.status === "merged" && <GitMerge className="h-5 w-5 text-chart-2" />}
                      {pr.status === "closed" && <GitPullRequestClosed className="h-5 w-5 text-destructive" />}
                    </div>
                    <div>
                      <Link
                        to={`/repository/${repositoryId}/pr/${pr.id}`}
                        className="text-base font-semibold text-foreground hover:text-ring hover:underline"
                      >
                        {pr.title}
                      </Link>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>#{pr.number} opened by {pr.author}</span>
                        <span>•</span>
                        <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">{pr.branch}</span>
                        <span>•</span>
                        <span>Updated {formatRelativeDate(pr.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {pr.issueCounts.high > 0 ? <Badge variant="destructive">{pr.issueCounts.high} High</Badge> : null}
                    {pr.issueCounts.medium > 0 ? <Badge className="bg-chart-1/10 text-chart-1 border-chart-1/20">{pr.issueCounts.medium} Med</Badge> : null}
                    {pr.issueCounts.low > 0 ? <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">{pr.issueCounts.low} Low</Badge> : null}
                    {pr.issueCounts.high + pr.issueCounts.medium + pr.issueCounts.low === 0 ? <Badge variant="outline">Clean</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page {pageData?.page ?? page} of {pageData?.totalPages ?? 1}
              </span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(pageData && page >= pageData.totalPages)}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card> : null}
    </div>
  );
}
