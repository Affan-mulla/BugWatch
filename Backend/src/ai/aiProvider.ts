import type { AnalysisIssue } from "../analysis/types.js";

export interface AIInput {
  issues: AnalysisIssue[];
  fileContext?: string;
}

export interface AIExplanation {
  ruleId: string;
  explanation: string;
  recommendation: string;
}

export interface AIProvider {
  generateExplanation(input: AIInput): Promise<AIExplanation[]>;
}
