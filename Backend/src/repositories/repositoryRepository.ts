import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export type InstallationStatus = "installed" | "not_installed";

export interface RepositoryRecord {
  id: number;
  githubRepoId: number;
  name: string;
  owner: string;
  reviewEnabled: boolean;
  installationStatus: InstallationStatus;
  installationId: number | null;
  accessCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UpsertRepositoryInput {
  githubRepoId: number;
  name: string;
  owner: string;
}

interface UpdateReviewStateInput {
  repositoryId: number;
  reviewEnabled: boolean;
}

interface UpdateAccessMetadataInput {
  repositoryId: number;
  installationStatus: InstallationStatus;
  installationId: number | null;
  accessCheckedAt: string;
}

export class RepositoryRepository {
  async upsert(input: UpsertRepositoryInput, db: Queryable = { query }): Promise<RepositoryRecord> {
    const result = await db.query<{
      id: number;
      github_repo_id: string;
      name: string;
      owner: string;
      review_enabled: boolean;
      installation_status: InstallationStatus;
      installation_id: string | null;
      access_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      INSERT INTO repositories (github_repo_id, name, owner)
      VALUES ($1, $2, $3)
      ON CONFLICT (github_repo_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        owner = EXCLUDED.owner,
        updated_at = NOW()
      RETURNING id, github_repo_id, name, owner, review_enabled, installation_status, installation_id, access_checked_at, created_at, updated_at
      `,
      [input.githubRepoId, input.name, input.owner]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      githubRepoId: Number(row.github_repo_id),
      name: row.name,
      owner: row.owner,
      reviewEnabled: row.review_enabled,
      installationStatus: row.installation_status,
      installationId: row.installation_id ? Number(row.installation_id) : null,
      accessCheckedAt: row.access_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listAll(db: Queryable = { query }): Promise<RepositoryRecord[]> {
    const result = await db.query<{
      id: number;
      github_repo_id: string;
      name: string;
      owner: string;
      review_enabled: boolean;
      installation_status: InstallationStatus;
      installation_id: string | null;
      access_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT id, github_repo_id, name, owner, review_enabled, installation_status, installation_id, access_checked_at, created_at, updated_at
      FROM repositories
      ORDER BY owner ASC, name ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      githubRepoId: Number(row.github_repo_id),
      name: row.name,
      owner: row.owner,
      reviewEnabled: row.review_enabled,
      installationStatus: row.installation_status,
      installationId: row.installation_id ? Number(row.installation_id) : null,
      accessCheckedAt: row.access_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findById(repositoryId: number, db: Queryable = { query }): Promise<RepositoryRecord | null> {
    const result = await db.query<{
      id: number;
      github_repo_id: string;
      name: string;
      owner: string;
      review_enabled: boolean;
      installation_status: InstallationStatus;
      installation_id: string | null;
      access_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT id, github_repo_id, name, owner, review_enabled, installation_status, installation_id, access_checked_at, created_at, updated_at
      FROM repositories
      WHERE id = $1
      `,
      [repositoryId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      githubRepoId: Number(row.github_repo_id),
      name: row.name,
      owner: row.owner,
      reviewEnabled: row.review_enabled,
      installationStatus: row.installation_status,
      installationId: row.installation_id ? Number(row.installation_id) : null,
      accessCheckedAt: row.access_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateReviewState(input: UpdateReviewStateInput, db: Queryable = { query }): Promise<RepositoryRecord | null> {
    const result = await db.query<{
      id: number;
      github_repo_id: string;
      name: string;
      owner: string;
      review_enabled: boolean;
      installation_status: InstallationStatus;
      installation_id: string | null;
      access_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      UPDATE repositories
      SET review_enabled = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, github_repo_id, name, owner, review_enabled, installation_status, installation_id, access_checked_at, created_at, updated_at
      `,
      [input.repositoryId, input.reviewEnabled]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      githubRepoId: Number(row.github_repo_id),
      name: row.name,
      owner: row.owner,
      reviewEnabled: row.review_enabled,
      installationStatus: row.installation_status,
      installationId: row.installation_id ? Number(row.installation_id) : null,
      accessCheckedAt: row.access_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateAccessMetadata(input: UpdateAccessMetadataInput, db: Queryable = { query }): Promise<RepositoryRecord | null> {
    const result = await db.query<{
      id: number;
      github_repo_id: string;
      name: string;
      owner: string;
      review_enabled: boolean;
      installation_status: InstallationStatus;
      installation_id: string | null;
      access_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      UPDATE repositories
      SET installation_status = $2,
          installation_id = $3,
          access_checked_at = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, github_repo_id, name, owner, review_enabled, installation_status, installation_id, access_checked_at, created_at, updated_at
      `,
      [input.repositoryId, input.installationStatus, input.installationId, input.accessCheckedAt]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      githubRepoId: Number(row.github_repo_id),
      name: row.name,
      owner: row.owner,
      reviewEnabled: row.review_enabled,
      installationStatus: row.installation_status,
      installationId: row.installation_id ? Number(row.installation_id) : null,
      accessCheckedAt: row.access_checked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const repositoryRepository = new RepositoryRepository();
