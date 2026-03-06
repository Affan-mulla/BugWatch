import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, GitPullRequest } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePullRequestDetail } from "@/hooks/usePullRequestDetail";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { DiffViewer } from "@/components/pr/DiffViewer";
import { IssuePanel } from "@/components/pr/IssuePanel";
import { useAppStore } from "@/store/appStore";

export function PRDetail() {
  const { id, prId } = useParams<{ id: string; prId: string }>();
  const selectedRepositoryId = useAppStore((state) => state.selectedRepositoryId);
  const repositoryId = id ?? selectedRepositoryId;
  const selectedPrId = prId ?? null;
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const { metadata, issues, diff, loading, errors, refetchMetadata, refetchIssues, refetchDiff } =
    usePullRequestDetail(repositoryId, selectedPrId);

  if (!repositoryId || !selectedPrId) {
    return (
      <ErrorState
        message="Missing repository or pull request context. Open a pull request from a repository page."
      />
    );
  }

  const severityBreakdown = useMemo(
    () =>
      issues.reduce(
        (acc, issue) => {
          acc[issue.severity] += 1;
          return acc;
        },
        { high: 0, medium: 0, low: 0 },
      ),
    [issues],
  );

  const hasLoadError = Boolean(errors.prMetadata || errors.prIssues || errors.prDiff);

  if (loading.prMetadata && !metadata) {
    return <LoadingSkeleton rows={6} />;
  }

  if (hasLoadError && !metadata) {
    return (
      <ErrorState
        message={errors.prMetadata || errors.prIssues || errors.prDiff || "Failed to load pull request details"}
        onRetry={() => {
          void Promise.all([refetchMetadata(), refetchIssues(), refetchDiff()]);
        }}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <Card className="flex-none p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center">
              <GitPullRequest className="mr-2 h-5 w-5 text-success" />
              {metadata?.title} <span className="ml-2 text-muted-foreground font-normal">#{metadata?.number}</span>
            </h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{metadata?.author}</span>
              <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-xs">
                {metadata?.branch}
              </span>
              <span>•</span>
              <span>{metadata?.filesChanged ?? 0} files changed</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Review Status:</span>
              {issues.length > 0 ? (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  {issues.length} Issues Found
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-[#238636]/10 text-[#238636] hover:bg-[#238636]/20 border-[#238636]/20">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Passed
                </Badge>
              )}
            </div>
            <div className="flex space-x-1.5">
              <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 rounded">
                {severityBreakdown.high} High
              </Badge>
              <Badge variant="outline" className="bg-[#D29922]/10 text-[#D29922] hover:bg-[#D29922]/20 border-[#D29922]/20 rounded">
                {severityBreakdown.medium} Med
              </Badge>
              <Badge variant="outline" className="bg-[#E3B341]/10 text-[#E3B341] hover:bg-[#E3B341]/20 border-[#E3B341]/20 rounded">
                {severityBreakdown.low} Low
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-4">
        <DiffViewer files={diff} issues={issues} selectedIssueId={selectedIssueId} onSelectIssue={setSelectedIssueId} />
        <IssuePanel issues={issues} selectedIssueId={selectedIssueId} />
      </div>
    </div>
  );
}
