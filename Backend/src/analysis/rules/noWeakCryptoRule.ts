import traverseModule, { type NodePath } from "@babel/traverse";
import type { CallExpression, File, Identifier, MemberExpression, StringLiteral } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ?? traverseModule) as (
  ast: File,
  visitors: TraverseOptions<File>
) => void;

const WEAK_ALGOS = new Set(["md5", "sha1"]);

export const noWeakCryptoRule: Rule = {
  id: "no-weak-crypto",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      CallExpression(path: NodePath<CallExpression>) {
        const { callee, arguments: args, loc } = path.node;
        if (!loc || callee.type !== "MemberExpression") {
          return;
        }

        const member = callee as MemberExpression;
        if (member.object.type !== "Identifier" || member.property.type !== "Identifier") {
          return;
        }

        const object = member.object as Identifier;
        const property = member.property as Identifier;
        if (object.name !== "crypto" || property.name !== "createHash") {
          return;
        }

        const firstArg = args[0];
        if (!firstArg || firstArg.type !== "StringLiteral") {
          return;
        }

        const algorithm = ((firstArg as StringLiteral).value ?? "").toLowerCase();
        if (!WEAK_ALGOS.has(algorithm)) {
          return;
        }

        issues.push({
          ruleId: "no-weak-crypto",
          message: `Weak hash algorithm '${algorithm}' detected.`,
          severity: "medium",
          filePath: context.filePath,
          line: loc.start.line,
          column: loc.start.column,
          suggestion: "Use strong algorithms such as sha256/sha512 or modern password hashing primitives.",
        });
      },
    });

    return issues;
  },
};
