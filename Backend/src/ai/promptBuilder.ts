import type { AIInput } from "./aiProvider.js";

export function buildExplanationPrompt(input: AIInput): string {
  const issuePayload = input.issues.map((issue) => ({
    ruleId: issue.ruleId,
    severity: issue.severity,
    filePath: issue.filePath,
    line: issue.line,
    column: issue.column,
    message: issue.message,
    suggestion: issue.suggestion,
  }));

  const contextSection = input.fileContext
    ? `\nAdditional file context:\n${input.fileContext}`
    : "";

  return [
    "You are an assistant that explains pre-detected static analysis issues.",
    "You must NOT detect new issues and must only explain the provided issues.",
    "Return JSON only with this exact schema (array of objects):",
    "[",
    '  {"ruleId":"string","explanation":"string","recommendation":"string"}',
    "]",
    "Rules:",
    "- Output MUST be valid JSON.",
    "- No markdown.",
    "- No prose outside JSON.",
    "- Keep explanations concise and actionable.",
    "Issues to explain:",
    JSON.stringify(issuePayload),
    contextSection,
  ].join("\n");
}
