import traverseModule, { type NodePath } from "@babel/traverse";
import type { File, TemplateLiteral } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ?? traverseModule) as (
  ast: File,
  visitors: TraverseOptions<File>
) => void;

const SQL_HINTS = ["select ", "insert ", "update ", "delete ", "from ", "where "];

export const noSqlTemplateInterpolationRule: Rule = {
  id: "no-sql-template-interpolation",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      TemplateLiteral(path: NodePath<TemplateLiteral>) {
        const { node } = path;
        if (node.expressions.length === 0 || !node.loc) {
          return;
        }

        const rawText = node.quasis.map((quasi) => quasi.value.raw.toLowerCase()).join(" ");
        const looksLikeSql = SQL_HINTS.some((hint) => rawText.includes(hint));
        if (!looksLikeSql) {
          return;
        }

        issues.push({
          ruleId: "no-sql-template-interpolation",
          message: "Template literal SQL with runtime interpolation can enable SQL injection.",
          severity: "high",
          filePath: context.filePath,
          line: node.loc.start.line,
          column: node.loc.start.column,
          suggestion: "Use parameterized queries with placeholders instead of string interpolation.",
        });
      },
    });

    return issues;
  },
};
