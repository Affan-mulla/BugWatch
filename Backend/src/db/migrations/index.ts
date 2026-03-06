import type { PoolClient } from "pg";
import { initialSchemaMigration } from "./001_initial_schema.js";
import { authSessionsMigration } from "./002_auth_sessions.js";
import { repositoryAccessMetadataMigration } from "./003_repository_access_metadata.js";

interface Migration {
  id: string;
  sql: string;
}

const migrations: Migration[] = [initialSchemaMigration, authSessionsMigration, repositoryAccessMetadataMigration];

export async function runMigrations(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM schema_migrations WHERE id = $1`,
      [migration.id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [migration.id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}
