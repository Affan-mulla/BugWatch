import type { PullRequestMetadata } from "../webhooks/extractPullRequestMetadata.js";
import type { AiReviewResult, EnrichedIssue } from "./aiReviewService.js";

interface FormatReviewCommentInput {
  metadata: PullRequestMetadata;
  aiReview: AiReviewResult;
}

function countBySeverity(issues: EnrichedIssue[]): Record<"high" | "medium" | "low", number> {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

function groupByFile(issues: EnrichedIssue[]): Map<string, EnrichedIssue[]> {
  const grouped = new Map<string, EnrichedIssue[]>();

  for (const issue of issues) {
    const existing = grouped.get(issue.filePath) ?? [];
    existing.push(issue);
    grouped.set(issue.filePath, existing);
  }

  return grouped;
}

export function formatReviewComment({ metadata, aiReview }: FormatReviewCommentInput): string {
  const severityCounts = countBySeverity(aiReview.enrichedIssues);

  const header = [
    "## Automated Code Review Summary",
    "",
    `PR: #${metadata.pullNumber} - ${metadata.title}`,
    `Total Issues: ${aiReview.enrichedIssues.length}`,
    `High: ${severityCounts.high}`,
    `Medium: ${severityCounts.medium}`,
    `Low: ${severityCounts.low}`,
    `AI Mode: ${aiReview.aiStatus}`,
    "",
  ];

  const groupedByFile = groupByFile(aiReview.enrichedIssues);
  const fileSections: string[] = [];

  for (const [filePath, fileIssues] of groupedByFile.entries()) {
    fileSections.push(`### File: ${filePath}`);
    fileSections.push("");

    fileIssues
      .sort((a, b) => {
        if (a.severity !== b.severity) {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a.severity] - order[b.severity];
        }

        return a.line - b.line;
      })
      .forEach((issue, index) => {
        const location = issue.column !== undefined ? `${issue.line}:${issue.column}` : `${issue.line}`;

        fileSections.push(`#### ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.ruleId}`);
        fileSections.push(`- Location: ${location}`);
        fileSections.push(`- Explanation: ${issue.explanation}`);
        fileSections.push(`- Recommendation: ${issue.recommendation}`);
        fileSections.push("");
      });
  }

  return [...header, ...fileSections].join("\n").trim();
}
