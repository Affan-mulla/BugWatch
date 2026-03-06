import traverseModule, { type NodePath } from "@babel/traverse";
import type { CallExpression, File, Identifier, MemberExpression } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ?? traverseModule) as (
  ast: File,
  visitors: TraverseOptions<File>
) => void;

export const noConsoleLogRule: Rule = {
  id: "no-console-log",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      CallExpression(path: NodePath<CallExpression>) {
        const { callee, loc } = path.node;
        if (!loc || callee.type !== "MemberExpression") {
          return;
        }

        const member = callee as MemberExpression;
        if (member.object.type !== "Identifier" || member.property.type !== "Identifier") {
          return;
        }

        const object = member.object as Identifier;
        const property = member.property as Identifier;
        if (object.name !== "console") {
          return;
        }

        if (!["log", "debug"].includes(property.name)) {
          return;
        }

        issues.push({
          ruleId: "no-console-log",
          message: "Avoid console logging in production code paths.",
          severity: "low",
          filePath: context.filePath,
          line: loc.start.line,
          column: loc.start.column,
          suggestion: "Use structured logger utilities with configurable levels.",
        });
      },
    });

    return issues;
  },
};
