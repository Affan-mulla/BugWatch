import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";
import { DatabaseError } from "../errors/DatabaseError.js";
import { runMigrations } from "./migrations/index.js";

export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}

const databaseUrl = env.databaseUrl;

if (!databaseUrl) {
  throw new DatabaseError("Missing required DATABASE_URL", { envKey: "DATABASE_URL" });
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

let initialized = false;

async function withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export async function initializeDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    await withClient(async (client) => {
      await client.query("SELECT 1");
      await runMigrations(client);
    });
    initialized = true;
    logger.info("Database initialized");
  } catch (error) {
    throw new DatabaseError("Database initialization failed", undefined, error);
  }
}

export async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await handler(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw new DatabaseError("Database transaction failed", undefined, error);
    }
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, values);
  } catch (error) {
    throw new DatabaseError("Database query failed", { text }, error);
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function shutdownDatabase(): Promise<void> {
  await pool.end();
}
