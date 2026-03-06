import type { Severity } from "../analysis/types.js";
import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export interface ReviewRunRecord {
  id: number;
  pullRequestId: number;
  headSha: string;
  totalIssues: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  aiMode: string;
  reviewId: string | null;
  createdAt: string;
}

interface CreateReviewRunInput {
  pullRequestId: number;
  headSha: string;
  totalIssues: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  aiMode: string;
  reviewId?: string;
}

export class ReviewRepository {
  async findByRepoAndPullNumberAndSha(
    owner: string,
    repoName: string,
    pullNumber: number,
    headSha: string,
    db: Queryable = { query }
  ): Promise<ReviewRunRecord | null> {
    const result = await db.query<{
      id: number;
      pull_request_id: number;
      head_sha: string;
      total_issues: number;
      high_count: number;
      medium_count: number;
      low_count: number;
      ai_mode: string;
      review_id: string | null;
      created_at: string;
    }>(
      `
      SELECT rr.id, rr.pull_request_id, rr.head_sha, rr.total_issues, rr.high_count, rr.medium_count, rr.low_count, rr.ai_mode, rr.review_id, rr.created_at
      FROM review_runs rr
      JOIN pull_requests pr ON pr.id = rr.pull_request_id
      JOIN repositories repo ON repo.id = pr.repository_id
      WHERE repo.owner = $1
        AND repo.name = $2
        AND pr.number = $3
        AND rr.head_sha = $4
      `,
      [owner, repoName, pullNumber, headSha]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      headSha: row.head_sha,
      totalIssues: row.total_issues,
      highCount: row.high_count,
      mediumCount: row.medium_count,
      lowCount: row.low_count,
      aiMode: row.ai_mode,
      reviewId: row.review_id,
      createdAt: row.created_at,
    };
  }

  async findByPullRequestAndSha(
    pullRequestId: number,
    headSha: string,
    db: Queryable = { query }
  ): Promise<ReviewRunRecord | null> {
    const result = await db.query<{
      id: number;
      pull_request_id: number;
      head_sha: string;
      total_issues: number;
      high_count: number;
      medium_count: number;
      low_count: number;
      ai_mode: string;
      review_id: string | null;
      created_at: string;
    }>(
      `
      SELECT id, pull_request_id, head_sha, total_issues, high_count, medium_count, low_count, ai_mode, review_id, created_at
      FROM review_runs
      WHERE pull_request_id = $1 AND head_sha = $2
      `,
      [pullRequestId, headSha]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      headSha: row.head_sha,
      totalIssues: row.total_issues,
      highCount: row.high_count,
      mediumCount: row.medium_count,
      lowCount: row.low_count,
      aiMode: row.ai_mode,
      reviewId: row.review_id,
      createdAt: row.created_at,
    };
  }

  async create(input: CreateReviewRunInput, db: Queryable = { query }): Promise<ReviewRunRecord> {
    const result = await db.query<{
      id: number;
      pull_request_id: number;
      head_sha: string;
      total_issues: number;
      high_count: number;
      medium_count: number;
      low_count: number;
      ai_mode: string;
      review_id: string | null;
      created_at: string;
    }>(
      `
      INSERT INTO review_runs (
        pull_request_id,
        head_sha,
        total_issues,
        high_count,
        medium_count,
        low_count,
        ai_mode,
        review_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, pull_request_id, head_sha, total_issues, high_count, medium_count, low_count, ai_mode, review_id, created_at
      `,
      [
        input.pullRequestId,
        input.headSha,
        input.totalIssues,
        input.highCount,
        input.mediumCount,
        input.lowCount,
        input.aiMode,
        input.reviewId ?? null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      headSha: row.head_sha,
      totalIssues: row.total_issues,
      highCount: row.high_count,
      mediumCount: row.medium_count,
      lowCount: row.low_count,
      aiMode: row.ai_mode,
      reviewId: row.review_id,
      createdAt: row.created_at,
    };
  }

  countSeverities(severities: Severity[]): { highCount: number; mediumCount: number; lowCount: number } {
    return severities.reduce(
      (accumulator, severity) => {
        if (severity === "high") {
          accumulator.highCount += 1;
        }

        if (severity === "medium") {
          accumulator.mediumCount += 1;
        }

        if (severity === "low") {
          accumulator.lowCount += 1;
        }

        return accumulator;
      },
      {
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      }
    );
  }

  async findLatestByPullRequestId(pullRequestId: number, db: Queryable = { query }): Promise<ReviewRunRecord | null> {
    const result = await db.query<{
      id: number;
      pull_request_id: number;
      head_sha: string;
      total_issues: number;
      high_count: number;
      medium_count: number;
      low_count: number;
      ai_mode: string;
      review_id: string | null;
      created_at: string;
    }>(
      `
      SELECT id, pull_request_id, head_sha, total_issues, high_count, medium_count, low_count, ai_mode, review_id, created_at
      FROM review_runs
      WHERE pull_request_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [pullRequestId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      headSha: row.head_sha,
      totalIssues: row.total_issues,
      highCount: row.high_count,
      mediumCount: row.medium_count,
      lowCount: row.low_count,
      aiMode: row.ai_mode,
      reviewId: row.review_id,
      createdAt: row.created_at,
    };
  }

  async countByRepository(repositoryId?: number, db: Queryable = { query }): Promise<number> {
    const result = repositoryId
      ? await db.query<{ total: string }>(
          `
          SELECT COUNT(*)::text AS total
          FROM review_runs rr
          JOIN pull_requests pr ON pr.id = rr.pull_request_id
          WHERE pr.repository_id = $1
          `,
          [repositoryId]
        )
      : await db.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM review_runs`);

    return Number(result.rows[0]?.total ?? 0);
  }
}

export const reviewRepository = new ReviewRepository();
