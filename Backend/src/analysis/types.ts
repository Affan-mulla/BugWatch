import type { File } from "@babel/types";

export type Severity = "low" | "medium" | "high";

export interface AnalysisIssue {
  ruleId: string;
  message: string;
  severity: Severity;
  filePath: string;
  line: number;
  column?: number;
  suggestion?: string;
}

export interface RuleContext {
  filePath: string;
  sourceCode: string;
  ast: File;
}

export interface Rule {
  id: string;
  run(context: RuleContext): AnalysisIssue[];
}