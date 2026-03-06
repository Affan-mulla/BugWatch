import type { Queryable } from "../db/client.js";
import { query } from "../db/client.js";

export type WebhookDeliveryStatus = "processing" | "success" | "failed" | "skipped";

export interface WebhookDeliveryRecord {
  deliveryId: string;
  event: string;
  prNumber: number;
  receivedAt: string;
  processedAt: string | null;
  status: WebhookDeliveryStatus;
  errorMessage: string | null;
}

interface CreateWebhookDeliveryInput {
  deliveryId: string;
  event: string;
  prNumber: number;
}

export class WebhookRepository {
  async findByDeliveryId(deliveryId: string, db: Queryable = { query }): Promise<WebhookDeliveryRecord | null> {
    const result = await db.query<{
      delivery_id: string;
      event: string;
      pr_number: number;
      received_at: string;
      processed_at: string | null;
      status: WebhookDeliveryStatus;
      error_message: string | null;
    }>(
      `
      SELECT delivery_id, event, pr_number, received_at, processed_at, status, error_message
      FROM webhook_deliveries
      WHERE delivery_id = $1
      `,
      [deliveryId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      deliveryId: row.delivery_id,
      event: row.event,
      prNumber: row.pr_number,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
      status: row.status,
      errorMessage: row.error_message,
    };
  }

  async createDelivery(input: CreateWebhookDeliveryInput, db: Queryable = { query }): Promise<void> {
    await db.query(
      `
      INSERT INTO webhook_deliveries (delivery_id, event, pr_number, status)
      VALUES ($1, $2, $3, $4)
      `,
      [input.deliveryId, input.event, input.prNumber, "processing"]
    );
  }

  async updateStatus(
    deliveryId: string,
    status: WebhookDeliveryStatus,
    errorMessage?: string,
    db: Queryable = { query }
  ): Promise<void> {
    await db.query(
      `
      UPDATE webhook_deliveries
      SET status = $1, processed_at = NOW(), error_message = $2
      WHERE delivery_id = $3
      `,
      [status, errorMessage ?? null, deliveryId]
    );
  }
}

export const webhookRepository = new WebhookRepository();
