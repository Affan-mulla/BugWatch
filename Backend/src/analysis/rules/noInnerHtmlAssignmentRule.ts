import traverseModule, { type NodePath } from "@babel/traverse";
import type { AssignmentExpression, File, Identifier, MemberExpression } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ?? traverseModule) as (
  ast: File,
  visitors: TraverseOptions<File>
) => void;

export const noInnerHtmlAssignmentRule: Rule = {
  id: "no-inner-html-assignment",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      AssignmentExpression(path: NodePath<AssignmentExpression>) {
        if (path.node.operator !== "=") {
          return;
        }

        const left = path.node.left;
        if (left.type !== "MemberExpression" || !left.loc) {
          return;
        }

        const member = left as MemberExpression;
        const property = member.property;
        if (!member.computed && property.type === "Identifier" && (property as Identifier).name === "innerHTML") {
          issues.push({
            ruleId: "no-inner-html-assignment",
            message: "Assignment to innerHTML may allow XSS if input is not sanitized.",
            severity: "high",
            filePath: context.filePath,
            line: left.loc.start.line,
            column: left.loc.start.column,
            suggestion: "Use textContent or sanitize HTML before assignment.",
          });
        }
      },
    });

    return issues;
  },
};
