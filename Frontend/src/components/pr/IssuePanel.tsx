import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { severityBadgeClass } from "@/utils/severity";
import type { PullRequestIssue } from "@/types/domain";

interface IssuePanelProps {
  issues: PullRequestIssue[];
  selectedIssueId: string | null;
}

export function IssuePanel({ issues, selectedIssueId }: IssuePanelProps) {
  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) ?? null,
    [issues, selectedIssueId],
  );

  if (!selectedIssue) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Select an inline marker in the diff to view deterministic and AI explanation details.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Badge className={severityBadgeClass(selectedIssue.severity)}>{selectedIssue.severity.toUpperCase()}</Badge>
        <span className="font-mono text-sm">{selectedIssue.rule}</span>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
        <p className="text-sm">{selectedIssue.filePath}:{selectedIssue.lineNumber}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Deterministic Reason</p>
        <p className="text-sm leading-relaxed text-foreground">{selectedIssue.deterministicReason}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Explanation</p>
        <p className="text-sm leading-relaxed text-foreground">{selectedIssue.aiExplanation}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested Fix</p>
        <pre className="overflow-x-auto rounded border border-border bg-muted/20 p-3 text-xs text-foreground">
          <code>{selectedIssue.suggestedFix}</code>
        </pre>
      </div>
    </Card>
  );
}
