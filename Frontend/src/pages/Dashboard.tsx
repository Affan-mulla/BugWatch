import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Github, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useRepositories } from "@/hooks/useRepositories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { formatRelativeDate } from "@/utils/format";

export function Dashboard() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const debouncedQuery = useDebouncedValue(query, 250);
  const { repositories, loading, error, selectRepository, toggleRepositoryReviewState, refetch } = useRepositories();

  const filteredRepositories = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return repositories;
    return repositories.filter((repo) => repo.fullName.toLowerCase().includes(normalized));
  }, [debouncedQuery, repositories]);

  const totalPages = Math.max(1, Math.ceil(filteredRepositories.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRepositories = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRepositories.slice(start, start + pageSize);
  }, [filteredRepositories, safePage]);

  const handleToggle = async (repositoryId: string, next: boolean) => {
    try {
      await toggleRepositoryReviewState(repositoryId, next);
    } catch {
      // rollback is handled in store
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter repositories..."
            className="pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      <Card>
        {loading ? (
          <div className="p-4">
            <LoadingSkeleton rows={6} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>App Access</TableHead>
                <TableHead>Review Enabled</TableHead>
                <TableHead>Last Analyzed</TableHead>
                <TableHead>Open Issues</TableHead>
                <TableHead>Navigate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRepositories.map((repo) => {
                const issueCounts = repo.issueCounts ?? { high: 0, medium: 0, low: 0 };
                return (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-muted-foreground" />
                        {repo.fullName}
                      </span>
                    </TableCell>
                    <TableCell>
                      {repo.appAccessible ? (
                        <Badge variant="outline">Installed</Badge>
                      ) : (
                        <Badge variant="destructive">No Access</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={repo.reviewEnabled}
                        disabled={!repo.appAccessible && !repo.reviewEnabled}
                        onCheckedChange={(checked) => {
                          void handleToggle(repo.id, checked);
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatRelativeDate(repo.lastAnalyzedAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {issueCounts.high > 0 ? <Badge variant="destructive">{issueCounts.high}H</Badge> : null}
                        {issueCounts.medium > 0 ? <Badge className="bg-chart-1/10 text-chart-1 border-chart-1/20">{issueCounts.medium}M</Badge> : null}
                        {issueCounts.low > 0 ? <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">{issueCounts.low}L</Badge> : null}
                        {issueCounts.high + issueCounts.medium + issueCounts.low === 0 ? <Badge variant="outline">Clean</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {repo.reviewEnabled && repo.appAccessible ? (
                        <Link
                          to={`/repository/${repo.id}/prs`}
                          className="text-sm text-primary hover:underline"
                          onClick={() => selectRepository(repo.id)}
                        >
                          Open PRs
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">Enable review to open</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {paginatedRepositories.length} of {filteredRepositories.length} repositories
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
