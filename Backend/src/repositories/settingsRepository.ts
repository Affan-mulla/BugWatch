import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export interface SettingsRecord {
  id: number;
  repositoryId: number;
  securityRulesEnabled: boolean;
  logicRulesEnabled: boolean;
  aiEnabled: boolean;
  severityThreshold: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

interface SaveSettingsInput {
  repositoryId: number;
  securityRulesEnabled: boolean;
  logicRulesEnabled: boolean;
  aiEnabled: boolean;
  severityThreshold: "low" | "medium" | "high";
}

export class SettingsRepository {
  async findByRepositoryId(repositoryId: number, db: Queryable = { query }): Promise<SettingsRecord | null> {
    const result = await db.query<{
      id: number;
      repository_id: number;
      security_rules_enabled: boolean;
      logic_rules_enabled: boolean;
      ai_enabled: boolean;
      severity_threshold: "low" | "medium" | "high";
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT id, repository_id, security_rules_enabled, logic_rules_enabled, ai_enabled, severity_threshold, created_at, updated_at
      FROM settings
      WHERE repository_id = $1
      `,
      [repositoryId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      repositoryId: row.repository_id,
      securityRulesEnabled: row.security_rules_enabled,
      logicRulesEnabled: row.logic_rules_enabled,
      aiEnabled: row.ai_enabled,
      severityThreshold: row.severity_threshold,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async upsert(input: SaveSettingsInput, db: Queryable = { query }): Promise<SettingsRecord> {
    const result = await db.query<{
      id: number;
      repository_id: number;
      security_rules_enabled: boolean;
      logic_rules_enabled: boolean;
      ai_enabled: boolean;
      severity_threshold: "low" | "medium" | "high";
      created_at: string;
      updated_at: string;
    }>(
      `
      INSERT INTO settings (
        repository_id,
        security_rules_enabled,
        logic_rules_enabled,
        ai_enabled,
        severity_threshold
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (repository_id)
      DO UPDATE SET
        security_rules_enabled = EXCLUDED.security_rules_enabled,
        logic_rules_enabled = EXCLUDED.logic_rules_enabled,
        ai_enabled = EXCLUDED.ai_enabled,
        severity_threshold = EXCLUDED.severity_threshold,
        updated_at = NOW()
      RETURNING id, repository_id, security_rules_enabled, logic_rules_enabled, ai_enabled, severity_threshold, created_at, updated_at
      `,
      [
        input.repositoryId,
        input.securityRulesEnabled,
        input.logicRulesEnabled,
        input.aiEnabled,
        input.severityThreshold,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      repositoryId: row.repository_id,
      securityRulesEnabled: row.security_rules_enabled,
      logicRulesEnabled: row.logic_rules_enabled,
      aiEnabled: row.ai_enabled,
      severityThreshold: row.severity_threshold,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const settingsRepository = new SettingsRepository();
