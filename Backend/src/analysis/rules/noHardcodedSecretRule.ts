import traverseModule, { type NodePath } from "@babel/traverse";
import type { AnalysisIssue, Rule } from "../types.js";
import type { File, VariableDeclarator } from "@babel/types";
import type { TraverseOptions } from "@babel/traverse";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ??
  traverseModule) as (ast: File, visitors: TraverseOptions<File>) => void;

const SECRET_IDENTIFIERS = ["apikey", "secret", "token", "password"];

function isSecretIdentifier(name: string): boolean {
  const normalized = name.toLowerCase();
  return SECRET_IDENTIFIERS.some((keyword) => normalized.includes(keyword));
}

export const noHardcodedSecretRule: Rule = {
  id: "no-hardcoded-secret",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      VariableDeclarator(path: NodePath<VariableDeclarator>) {
        const idNode = path.node.id;
        const initNode = path.node.init;

        if (idNode.type !== "Identifier" || !initNode) {
          return;
        }

        if (!isSecretIdentifier(idNode.name)) {
          return;
        }

        if (initNode.type !== "StringLiteral") {
          return;
        }

        if (initNode.value.length <= 20 || !initNode.loc) {
          return;
        }

        issues.push({
          ruleId: "no-hardcoded-secret",
          message:
            "Potential hardcoded secret detected. Move secrets to environment variables or secret manager.",
          severity: "high",
          filePath: context.filePath,
          line: initNode.loc.start.line,
          column: initNode.loc.start.column,
          suggestion: "Store this value in environment variables or a dedicated secret manager.",
        });
      },
    });

    return issues;
  },
};