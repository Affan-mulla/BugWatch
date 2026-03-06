import { parseSourceToAst } from "./astParser.js";
import { ruleRegistry } from "./ruleRegistry.js";
import type { AnalysisIssue, RuleContext } from "./types.js";
import type { PullRequestChangedFile } from "../github/pullRequestClient.js";
import { AnalyzerExecutionError } from "../errors/AppError.js";

export function analyzeFile(filePath: string, sourceCode: string): AnalysisIssue[] {
  const ast = parseSourceToAst(sourceCode);

  const context: RuleContext = {
    filePath,
    sourceCode,
    ast,
  };

  const issues: AnalysisIssue[] = [];

  for (const rule of ruleRegistry) {
    const ruleIssues = rule.run(context);
    issues.push(...ruleIssues);
  }

  return issues;
}

export interface StaticAnalysisMetadata {
  filename: string;
  language: string;
  hasPatch: boolean;
  additions: number;
  deletions: number;
  changes: number;
}

export interface StaticAnalysisResult {
  astMetadata: StaticAnalysisMetadata[];
  issues: AnalysisIssue[];
  warnings: string[];
}

export interface StaticAnalysisOptions {
  allowedExtensions?: string[];
  maxFilePatchBytes?: number;
  maxAstInputBytes?: number;
  maxIssuesPerFile?: number;
}

function inferLanguage(filename: string): string {
  if (filename.endsWith(".js") || filename.endsWith(".jsx")) {
    return "javascript";
  }

  if (filename.endsWith(".ts") || filename.endsWith(".tsx")) {
    return "typescript";
  }

  if (filename.endsWith(".py")) {
    return "python";
  }

  return "unknown";
}

function extractAddedSourceFromPatch(patch: string): string {
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");
}

function hasAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  return allowedExtensions.some((extension) => filename.endsWith(extension));
}

function isLikelyTruncatedPatch(file: PullRequestChangedFile): boolean {
  return file.changes > 0 && (!file.patch || file.patch.trim().length === 0);
}

export function runStaticAnalysis(files: PullRequestChangedFile[], options: StaticAnalysisOptions = {}): StaticAnalysisResult {
  const issues: AnalysisIssue[] = [];
  const warnings: string[] = [];
  const allowedExtensions = options.allowedExtensions ?? [".js", ".jsx", ".ts", ".tsx"];
  const maxFilePatchBytes = options.maxFilePatchBytes ?? 120 * 1024;
  const maxAstInputBytes = options.maxAstInputBytes ?? 256 * 1024;
  const maxIssuesPerFile = options.maxIssuesPerFile ?? 20;

  const astMetadata = files.map((file) => {
    if (!hasAllowedExtension(file.filename, allowedExtensions)) {
      warnings.push(`Skipping non-reviewable file type: ${file.filename}`);
      return {
        filename: file.filename,
        language: inferLanguage(file.filename),
        hasPatch: Boolean(file.patch),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
    }

    if (isLikelyTruncatedPatch(file)) {
      warnings.push(`Skipping file with missing or truncated patch: ${file.filename}`);
      return {
        filename: file.filename,
        language: inferLanguage(file.filename),
        hasPatch: Boolean(file.patch),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
    }

    if (Buffer.byteLength(file.patch, "utf8") > maxFilePatchBytes) {
      warnings.push(`Skipping oversized patch for file: ${file.filename}`);
      return {
        filename: file.filename,
        language: inferLanguage(file.filename),
        hasPatch: Boolean(file.patch),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
    }

    const sourceCode = extractAddedSourceFromPatch(file.patch);

    if (Buffer.byteLength(sourceCode, "utf8") > maxAstInputBytes) {
      warnings.push(`Skipping AST parse due to input size limit: ${file.filename}`);
      return {
        filename: file.filename,
        language: inferLanguage(file.filename),
        hasPatch: Boolean(file.patch),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
    }

    if (sourceCode.trim().length > 0) {
      try {
        const fileIssues = analyzeFile(file.filename, sourceCode).slice(0, maxIssuesPerFile);
        issues.push(...fileIssues);
      } catch (error) {
        const analyzerError = new AnalyzerExecutionError("Static analyzer execution failed", {
          filePath: file.filename,
        }, error);
        warnings.push(`${analyzerError.message}: ${file.filename}`);
      }
    }

    return {
      filename: file.filename,
      language: inferLanguage(file.filename),
      hasPatch: Boolean(file.patch),
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    };
  });

  return {
    astMetadata,
    issues,
    warnings,
  };
}
