import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { WebhookVerificationError } from "../errors/WebhookError.js";
import { normalizeDeliveryId } from "../utils/idempotency.js";
import { logger } from "../logging/logger.js";

export interface GithubWebhookRequest extends Request {
  githubEvent?: string;
  githubPayload?: unknown;
  githubDeliveryId?: string;
}

export function verifyGithubWebhook(req: GithubWebhookRequest, res: Response, next: NextFunction): Response | void {
  const deliveryId = normalizeDeliveryId(req.headers["x-github-delivery"] as string | undefined);
  const event = req.headers["x-github-event"] as string | undefined;

  try {
    const signature = req.headers["x-hub-signature-256"];

    if (!signature || typeof signature !== "string") {
      throw new WebhookVerificationError("Missing signature");
    }

    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      throw new WebhookVerificationError("Invalid request body");
    }

    const hmac = crypto.createHmac("sha256", env.githubWebhookSecret ?? "");
    const digest = `sha256=${hmac.update(rawBody).digest("hex")}`;

    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

    if (signatureBuffer.length !== digestBuffer.length) {
      throw new WebhookVerificationError("Invalid signature");
    }

    const isValid = crypto.timingSafeEqual(digestBuffer, signatureBuffer);

    if (!isValid) {
      throw new WebhookVerificationError("Invalid signature");
    }

    const contentType = (req.headers["content-type"] as string | undefined) ?? "";
    let payloadBody = rawBody.toString();

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = new URLSearchParams(payloadBody);
      const encodedPayload = formData.get("payload");

      if (!encodedPayload) {
        throw new Error("Missing form payload");
      }

      payloadBody = encodedPayload;
    }

    req.githubEvent = req.headers["x-github-event"] as string | undefined;
    req.githubDeliveryId = normalizeDeliveryId(req.headers["x-github-delivery"] as string | undefined);
    req.githubPayload = JSON.parse(payloadBody) as unknown;

    next();
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logger.warn("Webhook verification failed", {
        correlationId: deliveryId,
        event,
        reason: error.message,
        hasSignatureHeader: Boolean(req.headers["x-hub-signature-256"]),
        contentType: req.headers["content-type"],
      });
      return res.status(401).send(error.message);
    }

    return res.status(400).send("Invalid webhook payload");
  }
}
