import { describe, expect, it } from "vitest";
import { analyzeFile, runStaticAnalysis } from "./staticAnalysisService.js";

describe("AST static analysis", () => {
  it("detects no-eval violation", () => {
    const source = `
      function run(input) {
        eval(input);
      }
    `;

    const issues = analyzeFile("src/example.js", source);
    const evalIssue = issues.find((issue) => issue.ruleId === "no-eval");

    expect(evalIssue).toBeDefined();
    expect(evalIssue?.severity).toBe("high");
    expect(evalIssue?.line).toBeGreaterThan(0);
  });

  it("detects no-hardcoded-secret violation", () => {
    const source = `
      const apiKey = "123456789012345678901234567890";
    `;

    const issues = analyzeFile("src/secret.ts", source);
    const secretIssue = issues.find(
      (issue) => issue.ruleId === "no-hardcoded-secret"
    );

    expect(secretIssue).toBeDefined();
    expect(secretIssue?.severity).toBe("high");
  });

  it("detects require-try-catch-async violation", () => {
    const source = `
      async function getData() {
        await fetch("https://example.com");
      }
    `;

    const issues = analyzeFile("src/async.ts", source);
    const asyncIssue = issues.find(
      (issue) => issue.ruleId === "require-try-catch-async"
    );

    expect(asyncIssue).toBeDefined();
    expect(asyncIssue?.severity).toBe("medium");
  });

  it("does not report violations for clean code", () => {
    const source = `
      async function getData() {
        try {
          await fetch("https://example.com");
        } catch (error) {
          return null;
        }
      }

      const tokenLength = 10;
      const compute = (value) => value + 1;
    `;

    const issues = analyzeFile("src/clean.ts", source);

    expect(issues).toHaveLength(0);
  });

  it("detects multiple violations in one file", () => {
    const source = `
      const password = "this_is_a_very_long_hardcoded_secret";

      async function runTask(input) {
        eval(input);
        await Promise.resolve();
      }
    `;

    const issues = analyzeFile("src/multi.ts", source);
    const ruleIds = issues.map((issue) => issue.ruleId);

    expect(ruleIds).toContain("no-eval");
    expect(ruleIds).toContain("no-hardcoded-secret");
    expect(ruleIds).toContain("require-try-catch-async");
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });

  it("skips non JS/TS files safely", () => {
    const result = runStaticAnalysis([
      {
        filename: "README.md",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        patch: "+eval('test')",
      },
    ]);

    expect(result.issues).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("non-reviewable"))).toBe(true);
  });

  it("skips files with missing or truncated patches", () => {
    const result = runStaticAnalysis([
      {
        filename: "src/large.ts",
        status: "modified",
        additions: 500,
        deletions: 100,
        changes: 600,
        patch: "",
      },
    ]);

    expect(result.issues).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("missing or truncated patch"))).toBe(true);
  });
});