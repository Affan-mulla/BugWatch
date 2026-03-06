import { Router } from "express";
import { exchangeGithubCode, getCurrentSession, getGithubLoginUrl, logout } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/api/auth/github/login", getGithubLoginUrl);
router.post("/api/auth/github/exchange", exchangeGithubCode);
router.get("/api/auth/me", requireAuth, getCurrentSession);
router.post("/api/auth/logout", requireAuth, logout);

export default router;