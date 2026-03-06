import traverseModule, { type NodePath } from "@babel/traverse";
import type { File, JSXAttribute, JSXIdentifier } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ?? traverseModule) as (
  ast: File,
  visitors: TraverseOptions<File>
) => void;

export const noDangerouslySetInnerHtmlRule: Rule = {
  id: "no-dangerously-set-inner-html",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      JSXAttribute(path: NodePath<JSXAttribute>) {
        const attributeName = path.node.name;
        if (attributeName.type !== "JSXIdentifier") {
          return;
        }

        const identifier = attributeName as JSXIdentifier;
        if (identifier.name !== "dangerouslySetInnerHTML" || !identifier.loc) {
          return;
        }

        issues.push({
          ruleId: "no-dangerously-set-inner-html",
          message: "Avoid dangerouslySetInnerHTML to reduce XSS exposure.",
          severity: "high",
          filePath: context.filePath,
          line: identifier.loc.start.line,
          column: identifier.loc.start.column,
          suggestion: "Render trusted sanitized content only, or prefer explicit JSX composition.",
        });
      },
    });

    return issues;
  },
};
