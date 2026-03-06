import { parse } from "@babel/parser";
import type { File } from "@babel/types";

export function parseSourceToAst(sourceCode: string): File {
  return parse(sourceCode, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: false,
  });
}