import { describe, expect, it } from "vitest";
import { AIResponseValidationError, validateAIResponse } from "./schemaValidator.js";

describe("schemaValidator", () => {
  it("accepts valid explanation array", () => {
    const result = validateAIResponse(
      [
        {
          ruleId: "no-eval",
          explanation: "eval can execute arbitrary code",
          recommendation: "Use explicit parsing",
        },
      ],
      new Set(["no-eval"])
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.ruleId).toBe("no-eval");
  });

  it("rejects unexpected keys", () => {
    expect(() =>
      validateAIResponse(
        [
          {
            ruleId: "no-eval",
            explanation: "x",
            recommendation: "y",
            extra: "z",
          },
        ],
        new Set(["no-eval"])
      )
    ).toThrow(AIResponseValidationError);
  });

  it("rejects unknown rule ids", () => {
    expect(() =>
      validateAIResponse(
        [
          {
            ruleId: "unknown-rule",
            explanation: "x",
            recommendation: "y",
          },
        ],
        new Set(["no-eval"])
      )
    ).toThrow(AIResponseValidationError);
  });
});
