import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export interface UserRecord {
  id: number;
  githubId: number;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface UpsertUserInput {
  githubId: number;
  username: string;
  avatarUrl?: string;
}

export class UserRepository {
  async upsert(input: UpsertUserInput, db: Queryable = { query }): Promise<UserRecord> {
    const result = await db.query<{
      id: number;
      github_id: string;
      username: string;
      avatar_url: string | null;
      created_at: string;
    }>(
      `
      INSERT INTO users (github_id, username, avatar_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (github_id)
      DO UPDATE SET username = EXCLUDED.username, avatar_url = EXCLUDED.avatar_url
      RETURNING id, github_id, username, avatar_url, created_at
      `,
      [input.githubId, input.username, input.avatarUrl ?? null]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      githubId: Number(row.github_id),
      username: row.username,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    };
  }

  async findById(userId: number, db: Queryable = { query }): Promise<UserRecord | null> {
    const result = await db.query<{
      id: number;
      github_id: string;
      username: string;
      avatar_url: string | null;
      created_at: string;
    }>(
      `
      SELECT id, github_id, username, avatar_url, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      githubId: Number(row.github_id),
      username: row.username,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    };
  }
}

export const userRepository = new UserRepository();
