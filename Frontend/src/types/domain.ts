export type Severity = "high" | "medium" | "low";
export type PullRequestStatus = "open" | "closed" | "merged";
export type PullRequestListState = "open" | "closed" | "all";

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

export interface AuthSession {
  token: string;
  expiresAt?: string;
  user: User;
}

export interface SeverityCounts {
  high: number;
  medium: number;
  low: number;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  reviewEnabled: boolean;
  installationStatus: "installed" | "not_installed";
  installationId: string | null;
  accessCheckedAt: string | null;
  appAccessible: boolean;
  lastAnalyzedAt: string | null;
  issueCounts?: SeverityCounts;
}

export interface PullRequestSummary {
  id: string;
  number: number;
  title: string;
  status: PullRequestStatus;
  author: string;
  branch: string;
  updatedAt: string;
  issueCounts: SeverityCounts;
}

export interface PullRequestMetadata extends PullRequestSummary {
  createdAt: string;
  filesChanged: number;
  commits: number;
  additions: number;
  deletions: number;
}

export interface PullRequestIssue {
  id: string;
  filePath: string;
  lineNumber: number;
  rule: string;
  severity: Severity;
  deterministicReason: string;
  aiExplanation: string;
  suggestedFix: string;
}

export interface DiffLine {
  type: "context" | "added" | "removed";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffFile {
  path: string;
  language: string;
  lines: DiffLine[];
}

export interface MetricsTrendPoint {
  date: string;
  high: number;
  medium: number;
  low: number;
}

export interface RuleViolationMetric {
  rule: string;
  count: number;
  severity: Severity;
}

export interface MetricsSummary {
  totalPrsAnalyzed: number;
  totalIssues: number;
  mostViolatedRule: string;
  severityDistribution: SeverityCounts;
  trend: MetricsTrendPoint[];
  topRules: RuleViolationMetric[];
}

export interface RepositorySettings {
  enableSecurityRules: boolean;
  enableLogicRules: boolean;
  enablePatternRules: boolean;
  enableAiExplanations: boolean;
  severityThreshold: Severity;
}
