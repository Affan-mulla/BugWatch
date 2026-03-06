import type { Response } from "express";
import { type GithubWebhookRequest } from "../middleware/verifyGithubWebhook.js";
import type { PullRequestWebhookPayload } from "../webhooks/extractPullRequestMetadata.js";
import { enqueueWebhookJob, getWebhookQueueDepth } from "../services/webhookQueueService.js";
import { logger } from "../logging/logger.js";
import { WebhookError } from "../errors/WebhookError.js";

export async function handleGithubWebhook(req: GithubWebhookRequest, res: Response): Promise<Response> {
  try {
    const event = req.githubEvent;
    const payload = req.githubPayload as PullRequestWebhookPayload;
    const deliveryId = req.githubDeliveryId;

    const scopedLogger = logger.child({ correlationId: deliveryId, event });

    if (event !== "pull_request") {
      scopedLogger.info("Webhook event ignored", {
        reason: `Unsupported event '${event}'`,
      });

      return res.status(200).json({
        status: "ignored",
        reason: `Unsupported event '${event}'`,
      });
    }

    if (!deliveryId) {
      throw new WebhookError("Missing delivery ID header", {
        event,
      });
    }

    enqueueWebhookJob({
      event,
      payload,
      deliveryId,
    });

    scopedLogger.info("Webhook enqueued for background processing", {
      queueDepth: getWebhookQueueDepth(),
    });

    return res.status(200).json({
      status: "queued",
      deliveryId,
      queueDepth: getWebhookQueueDepth(),
    });
  } catch (error) {
    logger.error("Webhook controller failed", {
      correlationId: req.githubDeliveryId,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const statusCode = error instanceof WebhookError ? error.statusCode : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to process webhook",
    });
  }
}
