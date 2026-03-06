import type { PullRequestWebhookPayload } from "../webhooks/extractPullRequestMetadata.js";
import { logger } from "../logging/logger.js";
import { processPullRequestWebhook } from "./pullRequestReviewService.js";

interface WebhookQueueItem {
  event: string;
  deliveryId?: string;
  payload: PullRequestWebhookPayload;
}

const queue: WebhookQueueItem[] = [];
let isProcessing = false;

async function processNextItem(): Promise<void> {
  const nextItem = queue.shift();
  if (!nextItem) {
    isProcessing = false;
    return;
  }

  try {
    await processPullRequestWebhook(nextItem);
  } catch (error) {
    logger.error("Background webhook processing failed", {
      correlationId: nextItem.deliveryId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  setImmediate(() => {
    void processNextItem();
  });
}

export function enqueueWebhookJob(item: WebhookQueueItem): void {
  queue.push(item);

  if (isProcessing) {
    return;
  }

  isProcessing = true;
  setImmediate(() => {
    void processNextItem();
  });
}

export function getWebhookQueueDepth(): number {
  return queue.length;
}
