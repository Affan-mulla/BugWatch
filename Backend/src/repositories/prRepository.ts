import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export interface PullRequestRecord {
  id: number;
  githubPrId: number | null;
  repositoryId: number;
  number: number;
  title: string;
  author: string;
  status: string;
  headSha: string;
  baseSha: string | null;
  createdAt: string;
  mergedAt: string | null;
  updatedAt: string;
}

interface UpsertPullRequestInput {
  repositoryId: number;
  githubPrId?: number;
  number: number;
  title: string;
  author: string;
  status: "open" | "closed";
  headSha: string;
  baseSha: string;
  mergedAt?: string | null;
}

export class PrRepository {
  async upsert(input: UpsertPullRequestInput, db: Queryable = { query }): Promise<PullRequestRecord> {
    const result = await db.query<{
      id: number;
      github_pr_id: string | null;
      repository_id: number;
      number: number;
      title: string;
      author: string;
      status: string;
      head_sha: string;
      base_sha: string | null;
      created_at: string;
      merged_at: string | null;
      updated_at: string;
    }>(
      `
      INSERT INTO pull_requests (
        github_pr_id,
        repository_id,
        number,
        title,
        author,
        status,
        head_sha,
        base_sha,
        merged_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (repository_id, number)
      DO UPDATE SET
        github_pr_id = EXCLUDED.github_pr_id,
        title = EXCLUDED.title,
        author = EXCLUDED.author,
        status = EXCLUDED.status,
        head_sha = EXCLUDED.head_sha,
        base_sha = EXCLUDED.base_sha,
        merged_at = EXCLUDED.merged_at,
        updated_at = NOW()
      RETURNING id, github_pr_id, repository_id, number, title, author, status, head_sha, base_sha, created_at, merged_at, updated_at
      `,
      [
        input.githubPrId ?? null,
        input.repositoryId,
        input.number,
        input.title,
        input.author,
        input.status,
        input.headSha,
        input.baseSha,
        input.mergedAt ?? null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      githubPrId: row.github_pr_id ? Number(row.github_pr_id) : null,
      repositoryId: row.repository_id,
      number: row.number,
      title: row.title,
      author: row.author,
      status: row.status,
      headSha: row.head_sha,
      baseSha: row.base_sha,
      createdAt: row.created_at,
      mergedAt: row.merged_at,
      updatedAt: row.updated_at,
    };
  }

  async listByRepositoryId(
    repositoryId: number,
    page: number,
    pageSize: number,
    db: Queryable = { query }
  ): Promise<{ items: PullRequestRecord[]; total: number }> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, Math.min(100, pageSize));
    const offset = (safePage - 1) * safePageSize;

    const totalResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM pull_requests WHERE repository_id = $1`,
      [repositoryId]
    );

    const rowsResult = await db.query<{
      id: number;
      github_pr_id: string | null;
      repository_id: number;
      number: number;
      title: string;
      author: string;
      status: string;
      head_sha: string;
      base_sha: string | null;
      created_at: string;
      merged_at: string | null;
      updated_at: string;
    }>(
      `
      SELECT id, github_pr_id, repository_id, number, title, author, status, head_sha, base_sha, created_at, merged_at, updated_at
      FROM pull_requests
      WHERE repository_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
      `,
      [repositoryId, safePageSize, offset]
    );

    return {
      total: Number(totalResult.rows[0]?.total ?? 0),
      items: rowsResult.rows.map((row) => ({
        id: row.id,
        githubPrId: row.github_pr_id ? Number(row.github_pr_id) : null,
        repositoryId: row.repository_id,
        number: row.number,
        title: row.title,
        author: row.author,
        status: row.status,
        headSha: row.head_sha,
        baseSha: row.base_sha,
        createdAt: row.created_at,
        mergedAt: row.merged_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async findById(prId: number, db: Queryable = { query }): Promise<PullRequestRecord | null> {
    const result = await db.query<{
      id: number;
      github_pr_id: string | null;
      repository_id: number;
      number: number;
      title: string;
      author: string;
      status: string;
      head_sha: string;
      base_sha: string | null;
      created_at: string;
      merged_at: string | null;
      updated_at: string;
    }>(
      `
      SELECT id, github_pr_id, repository_id, number, title, author, status, head_sha, base_sha, created_at, merged_at, updated_at
      FROM pull_requests
      WHERE id = $1
      `,
      [prId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      githubPrId: row.github_pr_id ? Number(row.github_pr_id) : null,
      repositoryId: row.repository_id,
      number: row.number,
      title: row.title,
      author: row.author,
      status: row.status,
      headSha: row.head_sha,
      baseSha: row.base_sha,
      createdAt: row.created_at,
      mergedAt: row.merged_at,
      updatedAt: row.updated_at,
    };
  }
}

export const prRepository = new PrRepository();
