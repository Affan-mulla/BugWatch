import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getMetricsSummary,
  getPr,
  getPrDiff,
  getPrIssues,
  getRepoSettings,
  listAvailableRepos,
  listRepoPrs,
  listRepos,
  patchRepoReviewState,
  patchRepoSettings,
} from "../controllers/apiController.js";

const router = Router();

router.use(requireAuth);

router.get("/api/repos", listRepos);
router.get("/api/repos/available", listAvailableRepos);
router.get("/api/repos/:repoId/prs", listRepoPrs);
router.get("/api/pr/:prId", getPr);
router.get("/api/pr/:prId/issues", getPrIssues);
router.get("/api/pr/:prId/diff", getPrDiff);
router.patch("/api/repos/:repoId/settings", patchRepoSettings);

router.get("/api/repos/:repoId/settings", getRepoSettings);
router.patch("/api/repos/:repoId/review-state", patchRepoReviewState);
router.get("/api/metrics", getMetricsSummary);

export default router;
