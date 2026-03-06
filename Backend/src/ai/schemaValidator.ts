import type { AIExplanation } from "./aiProvider.js";

export class AIResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIResponseValidationError";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOnlyExpectedKeys(payload: Record<string, unknown>): boolean {
  const expectedKeys = ["ruleId", "explanation", "recommendation"];
  const keys = Object.keys(payload);

  if (keys.length !== expectedKeys.length) {
    return false;
  }

  return keys.every((key) => expectedKeys.includes(key));
}

export function validateAIResponse(
  rawResponse: unknown,
  knownRuleIds: Set<string>
): AIExplanation[] {
  if (!Array.isArray(rawResponse)) {
    throw new AIResponseValidationError("AI response must be an array");
  }

  const explanations: AIExplanation[] = [];

  for (const item of rawResponse) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AIResponseValidationError("AI response item must be an object");
    }

    const record = item as Record<string, unknown>;

    if (!hasOnlyExpectedKeys(record)) {
      throw new AIResponseValidationError("AI response contains unexpected keys");
    }

    if (!isNonEmptyString(record.ruleId)) {
      throw new AIResponseValidationError("AI response ruleId must be a non-empty string");
    }

    if (!knownRuleIds.has(record.ruleId)) {
      throw new AIResponseValidationError(`Unknown ruleId '${record.ruleId}' in AI response`);
    }

    if (!isNonEmptyString(record.explanation)) {
      throw new AIResponseValidationError("AI response explanation must be a non-empty string");
    }

    if (!isNonEmptyString(record.recommendation)) {
      throw new AIResponseValidationError("AI response recommendation must be a non-empty string");
    }

    explanations.push({
      ruleId: record.ruleId,
      explanation: record.explanation,
      recommendation: record.recommendation,
    });
  }

  if (explanations.length === 0) {
    throw new AIResponseValidationError("AI response cannot be an empty array");
  }

  return explanations;
}
