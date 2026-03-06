import express, { Router } from "express";
import { verifyGithubWebhook } from "../middleware/verifyGithubWebhook.js";
import { handleGithubWebhook } from "../controllers/webhookController.js";
import { getHealth } from "../controllers/healthController.js";

const router = Router();

router.get("/health", getHealth);
router.post("/webhook", express.raw({ type: "*/*" }), verifyGithubWebhook, handleGithubWebhook);

export default router;
