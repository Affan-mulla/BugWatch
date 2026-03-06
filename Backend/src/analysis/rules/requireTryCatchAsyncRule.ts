import traverseModule, { type NodePath } from "@babel/traverse";
import type {
  ArrowFunctionExpression,
  File,
  FunctionDeclaration,
  FunctionExpression,
} from "@babel/types";
import type { AnalysisIssue, Rule } from "../types.js";
import type { TraverseOptions } from "@babel/traverse";

const traverse = ((traverseModule as unknown as { default?: unknown }).default ??
  traverseModule) as (ast: File, visitors: TraverseOptions<File>) => void;

type SupportedFunctionPath =
  | NodePath<FunctionDeclaration>
  | NodePath<FunctionExpression>
  | NodePath<ArrowFunctionExpression>;

function inspectAsyncFunction(path: SupportedFunctionPath, filePath: string, issues: AnalysisIssue[]): void {
  const { node } = path;

  if (!node.async || !node.loc || node.body.type !== "BlockStatement") {
    return;
  }

  let hasAwait = false;
  let hasTry = false;

  path.traverse({
    AwaitExpression(awaitPath) {
      if (awaitPath.getFunctionParent() === path) {
        hasAwait = true;
      }
    },
    TryStatement(tryPath) {
      if (tryPath.getFunctionParent() === path) {
        hasTry = true;
      }
    },
    FunctionDeclaration(innerPath) {
      if (innerPath !== path) {
        innerPath.skip();
      }
    },
    FunctionExpression(innerPath) {
      if (innerPath !== path) {
        innerPath.skip();
      }
    },
    ArrowFunctionExpression(innerPath) {
      if (innerPath !== path) {
        innerPath.skip();
      }
    },
  });

  if (!hasAwait || hasTry) {
    return;
  }

  issues.push({
    ruleId: "require-try-catch-async",
    message:
      "Async function contains await without try/catch. Add error handling around awaited operations.",
    severity: "medium",
    filePath,
    line: node.loc.start.line,
    column: node.loc.start.column,
    suggestion: "Wrap awaited operations in try/catch and handle failures explicitly.",
  });
}

export const requireTryCatchAsyncRule: Rule = {
  id: "require-try-catch-async",
  run(context) {
    const issues: AnalysisIssue[] = [];

    traverse(context.ast, {
      FunctionDeclaration(path: NodePath<FunctionDeclaration>) {
        inspectAsyncFunction(path, context.filePath, issues);
      },
      FunctionExpression(path: NodePath<FunctionExpression>) {
        inspectAsyncFunction(path, context.filePath, issues);
      },
      ArrowFunctionExpression(path: NodePath<ArrowFunctionExpression>) {
        inspectAsyncFunction(path, context.filePath, issues);
      },
    });

    return issues;
  },
};
