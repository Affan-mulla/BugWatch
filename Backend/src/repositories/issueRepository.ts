import type { AnalysisIssue } from "../analysis/types.js";
import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export class IssueRepository {
  async insertMany(reviewRunId: number, issues: AnalysisIssue[], db: Queryable = { query }): Promise<void> {
    if (issues.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders = issues.map((issue, index) => {
      const offset = index * 8;
      values.push(
        reviewRunId,
        issue.filePath,
        issue.line,
        issue.ruleId,
        issue.severity,
        issue.message,
        issue.suggestion ?? null,
        null
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${
        offset + 7
      }, $${offset + 8})`;
    });

    await db.query(
      `
      INSERT INTO issues (
        review_run_id,
        file_path,
        line_number,
        rule_name,
        severity,
        rule_explanation,
        suggested_fix,
        code_snippet
      )
      VALUES ${placeholders.join(", ")}
      `,
      values
    );
  }

  async listByReviewRunId(
    reviewRunId: number,
    threshold?: "low" | "medium" | "high",
    db: Queryable = { query }
  ): Promise<
    Array<{
      id: number;
      filePath: string;
      lineNumber: number;
      ruleName: string;
      severity: "low" | "medium" | "high";
      ruleExplanation: string | null;
      aiExplanation: string | null;
      suggestedFix: string | null;
      codeSnippet: string | null;
      createdAt: string;
    }>
  > {
    const rank = {
      low: 1,
      medium: 2,
      high: 3,
    } as const;

    const minRank = threshold ? rank[threshold] : 1;

    const result = await db.query<{
      id: number;
      file_path: string;
      line_number: number;
      rule_name: string;
      severity: "low" | "medium" | "high";
      rule_explanation: string | null;
      ai_explanation: string | null;
      suggested_fix: string | null;
      code_snippet: string | null;
      created_at: string;
    }>(
      `
      SELECT id, file_path, line_number, rule_name, severity, rule_explanation, ai_explanation, suggested_fix, code_snippet, created_at
      FROM issues
      WHERE review_run_id = $1
        AND (
          CASE severity
            WHEN 'low' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'high' THEN 3
          END
        ) >= $2
      ORDER BY severity DESC, file_path ASC, line_number ASC
      `,
      [reviewRunId, minRank]
    );

    return result.rows.map((row) => ({
      id: row.id,
      filePath: row.file_path,
      lineNumber: row.line_number,
      ruleName: row.rule_name,
      severity: row.severity,
      ruleExplanation: row.rule_explanation,
      aiExplanation: row.ai_explanation,
      suggestedFix: row.suggested_fix,
      codeSnippet: row.code_snippet,
      createdAt: row.created_at,
    }));
  }

  async getSeverityTotals(repositoryId?: number, db: Queryable = { query }): Promise<{ high: number; medium: number; low: number }> {
    const result = repositoryId
      ? await db.query<{
          severity: "low" | "medium" | "high";
          total: string;
        }>(
          `
          SELECT i.severity, COUNT(*)::text AS total
          FROM issues i
          JOIN review_runs rr ON rr.id = i.review_run_id
          JOIN pull_requests pr ON pr.id = rr.pull_request_id
          WHERE pr.repository_id = $1
          GROUP BY i.severity
          `,
          [repositoryId]
        )
      : await db.query<{
          severity: "low" | "medium" | "high";
          total: string;
        }>(
          `
          SELECT severity, COUNT(*)::text AS total
          FROM issues
          GROUP BY severity
          `
        );

    const totals = { high: 0, medium: 0, low: 0 };
    for (const row of result.rows) {
      totals[row.severity] = Number(row.total);
    }
    return totals;
  }

  async listTopRules(
    repositoryId?: number,
    limit = 5,
    db: Queryable = { query }
  ): Promise<Array<{ rule: string; count: number; severity: "low" | "medium" | "high" }>> {
    const result = repositoryId
      ? await db.query<{
          rule_name: string;
          total: string;
          severity: "low" | "medium" | "high";
        }>(
          `
          SELECT i.rule_name, COUNT(*)::text AS total,
            (ARRAY_AGG(i.severity ORDER BY CASE i.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC))[1] AS severity
          FROM issues i
          JOIN review_runs rr ON rr.id = i.review_run_id
          JOIN pull_requests pr ON pr.id = rr.pull_request_id
          WHERE pr.repository_id = $1
          GROUP BY i.rule_name
          ORDER BY COUNT(*) DESC
          LIMIT $2
          `,
          [repositoryId, limit]
        )
      : await db.query<{
          rule_name: string;
          total: string;
          severity: "low" | "medium" | "high";
        }>(
          `
          SELECT rule_name, COUNT(*)::text AS total,
            (ARRAY_AGG(severity ORDER BY CASE severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC))[1] AS severity
          FROM issues
          GROUP BY rule_name
          ORDER BY COUNT(*) DESC
          LIMIT $1
          `,
          [limit]
        );

    return result.rows.map((row) => ({
      rule: row.rule_name,
      count: Number(row.total),
      severity: row.severity,
    }));
  }

  async listTrend(repositoryId?: number, db: Queryable = { query }): Promise<Array<{ date: string; high: number; medium: number; low: number }>> {
    const result = repositoryId
      ? await db.query<{
          date: string;
          high: string;
          medium: string;
          low: string;
        }>(
          `
          SELECT
            TO_CHAR(DATE(rr.created_at), 'Mon DD') AS date,
            COUNT(*) FILTER (WHERE i.severity = 'high')::text AS high,
            COUNT(*) FILTER (WHERE i.severity = 'medium')::text AS medium,
            COUNT(*) FILTER (WHERE i.severity = 'low')::text AS low
          FROM issues i
          JOIN review_runs rr ON rr.id = i.review_run_id
          JOIN pull_requests pr ON pr.id = rr.pull_request_id
          WHERE pr.repository_id = $1
          GROUP BY DATE(rr.created_at)
          ORDER BY DATE(rr.created_at) ASC
          LIMIT 16
          `,
          [repositoryId]
        )
      : await db.query<{
          date: string;
          high: string;
          medium: string;
          low: string;
        }>(
          `
          SELECT
            TO_CHAR(DATE(rr.created_at), 'Mon DD') AS date,
            COUNT(*) FILTER (WHERE i.severity = 'high')::text AS high,
            COUNT(*) FILTER (WHERE i.severity = 'medium')::text AS medium,
            COUNT(*) FILTER (WHERE i.severity = 'low')::text AS low
          FROM issues i
          JOIN review_runs rr ON rr.id = i.review_run_id
          GROUP BY DATE(rr.created_at)
          ORDER BY DATE(rr.created_at) ASC
          LIMIT 16
          `
        );

    return result.rows.map((row) => ({
      date: row.date,
      high: Number(row.high),
      medium: Number(row.medium),
      low: Number(row.low),
    }));
  }
}

export const issueRepository = new IssueRepository();
