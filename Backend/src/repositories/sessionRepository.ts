import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export interface SessionRecord {
  token: string;
  userId: number;
  githubAccessToken: string;
  expiresAt: string;
  createdAt: string;
}

interface CreateSessionInput {
  token: string;
  userId: number;
  githubAccessToken: string;
  expiresAt: string;
}

export class SessionRepository {
  async create(input: CreateSessionInput, db: Queryable = { query }): Promise<SessionRecord> {
    const result = await db.query<{
      token: string;
      user_id: number;
      github_access_token: string;
      expires_at: string;
      created_at: string;
    }>(
      `
      INSERT INTO auth_sessions (token, user_id, github_access_token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING token, user_id, github_access_token, expires_at, created_at
      `,
      [input.token, input.userId, input.githubAccessToken, input.expiresAt]
    );

    const row = result.rows[0];
    return {
      token: row.token,
      userId: row.user_id,
      githubAccessToken: row.github_access_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async findValidByToken(token: string, db: Queryable = { query }): Promise<SessionRecord | null> {
    const result = await db.query<{
      token: string;
      user_id: number;
      github_access_token: string;
      expires_at: string;
      created_at: string;
    }>(
      `
      SELECT token, user_id, github_access_token, expires_at, created_at
      FROM auth_sessions
      WHERE token = $1 AND expires_at > NOW()
      `,
      [token]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      token: row.token,
      userId: row.user_id,
      githubAccessToken: row.github_access_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async deleteByToken(token: string, db: Queryable = { query }): Promise<void> {
    await db.query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
  }

  async deleteExpired(db: Queryable = { query }): Promise<void> {
    await db.query(`DELETE FROM auth_sessions WHERE expires_at <= NOW()`);
  }
}

export const sessionRepository = new SessionRepository();
