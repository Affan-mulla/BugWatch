import traverseModule, { type NodePath } from "@babel/traverse";
import type { CallExpression, File, Identifier } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ??
  traverseModule) as (ast: File, visitors: TraverseOptions<File>) => void;

export const noEvalRule: Rule = {
  id: "no-eval",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      CallExpression(path: NodePath<CallExpression>) {
        const callee = path.node.callee;

        if (callee.type !== "Identifier") {
          return;
        }

        const identifier = callee as Identifier;

        if (identifier.name !== "eval") {
          return;
        }

        const callExpression = path.node as CallExpression;
        if (!callExpression.loc) {
          return;
        }

        issues.push({
          ruleId: "no-eval",
          message: "Avoid using eval() because it introduces serious security risks.",
          severity: "high",
          filePath: context.filePath,
          line: callExpression.loc.start.line,
          column: callExpression.loc.start.column,
          suggestion: "Refactor to explicit parsing or validated function dispatch instead of eval().",
        });
      },
    });

    return issues;
  },
};