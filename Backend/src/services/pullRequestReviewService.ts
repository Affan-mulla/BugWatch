import { createInstallationOctokit } from "../github/auth.js";
import { listPullRequestFiles } from "../github/pullRequestClient.js";
import { postPullRequestReviewComment } from "../github/reviewClient.js";
import {
  extractPullRequestMetadata,
  type PullRequestMetadata,
  type PullRequestWebhookPayload,
} from "../webhooks/extractPullRequestMetadata.js";
import { runStaticAnalysis } from "../analysis/staticAnalysisService.js";
import { generateAiReview } from "../analysis/aiReviewService.js";
import { formatReviewComment } from "../analysis/reviewCommentFormatter.js";
import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";
import { withTransaction } from "../db/client.js";
import { webhookRepository, type WebhookRepository } from "../repositories/webhookRepository.js";
import { reviewRepository, type ReviewRepository } from "../repositories/reviewRepository.js";
import { repositoryRepository, type RepositoryRepository } from "../repositories/repositoryRepository.js";
import { prRepository, type PrRepository } from "../repositories/prRepository.js";
import { issueRepository, type IssueRepository } from "../repositories/issueRepository.js";
import { WebhookError } from "../errors/WebhookError.js";
import { GitHubError } from "../errors/GitHubError.js";
import { AIProviderError } from "../errors/AIProviderError.js";

const REVIEWABLE_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

export interface PullRequestReviewResult {
  skipped: boolean;
  reason?: string;
  metadata: PullRequestMetadata;
  issueCount?: number;
  aiMode?: "success" | "partial-fallback" | "fallback";
  reviewId?: string;
}

export interface ProcessPullRequestWebhookInput {
  payload: PullRequestWebhookPayload;
  event: string;
  deliveryId?: string;
}

interface PullRequestReviewDependencies {
  createInstallationOctokit: typeof createInstallationOctokit;
  listPullRequestFiles: typeof listPullRequestFiles;
  postPullRequestReviewComment: typeof postPullRequestReviewComment;
  runStaticAnalysis: typeof runStaticAnalysis;
  generateAiReview: typeof generateAiReview;
  formatReviewComment: typeof formatReviewComment;
  webhookRepository: WebhookRepository;
  reviewRepository: ReviewRepository;
  repositoryRepository: RepositoryRepository;
  prRepository: PrRepository;
  issueRepository: IssueRepository;
  withTransaction: typeof withTransaction;
}

const defaultDependencies: PullRequestReviewDependencies = {
  createInstallationOctokit,
  listPullRequestFiles,
  postPullRequestReviewComment,
  runStaticAnalysis,
  generateAiReview,
  formatReviewComment,
  webhookRepository,
  reviewRepository,
  repositoryRepository,
  prRepository,
  issueRepository,
  withTransaction,
};

export async function processPullRequestWebhook(
  input: ProcessPullRequestWebhookInput,
  dependencies: PullRequestReviewDependencies = defaultDependencies
): Promise<PullRequestReviewResult> {
  const metadata = extractPullRequestMetadata(input.payload);
  const correlationId = input.deliveryId;
  const scopedLogger = logger.child({
    correlationId,
    owner: metadata.owner,
    repo: metadata.repo,
    prNumber: metadata.pullNumber,
    headSha: metadata.headSha,
  });

  if (!correlationId) {
    throw new WebhookError("Missing x-github-delivery header", {
      event: input.event,
      prNumber: metadata.pullNumber,
    });
  }

  scopedLogger.info("Webhook received", {
    action: metadata.action,
    event: input.event,
  });

  const existingDelivery = await dependencies.webhookRepository.findByDeliveryId(correlationId);
  if (existingDelivery) {
    scopedLogger.info("Duplicate webhook delivery detected; skipping", {
      status: existingDelivery.status,
      processedAt: existingDelivery.processedAt,
    });

    return {
      skipped: true,
      reason: "Duplicate webhook delivery",
      metadata,
    };
  }

  await dependencies.webhookRepository.createDelivery({
    deliveryId: correlationId,
    event: input.event,
    prNumber: metadata.pullNumber,
  });

  if (!REVIEWABLE_ACTIONS.has(metadata.action)) {
    await dependencies.webhookRepository.updateStatus(correlationId, "skipped");

    return {
      skipped: true,
      reason: `Action '${metadata.action}' is not configured for analysis`,
      metadata,
    };
  }

  const existingRun = await dependencies.reviewRepository.findByRepoAndPullNumberAndSha(
    metadata.owner,
    metadata.repo,
    metadata.pullNumber,
    metadata.headSha
  );

  if (existingRun) {
    scopedLogger.info("Duplicate PR SHA detected; skipping", {
      reviewRunId: existingRun.id,
    });
    await dependencies.webhookRepository.updateStatus(correlationId, "skipped");

    return {
      skipped: true,
      reason: "PR head SHA already reviewed",
      metadata,
    };
  }

  try {
    const octokit = await dependencies.createInstallationOctokit(metadata.installationId);

    const files = await dependencies.listPullRequestFiles({
      octokit,
      owner: metadata.owner,
      repo: metadata.repo,
      pullNumber: metadata.pullNumber,
    });

    scopedLogger.info("PR metadata extracted", {
      changedFiles: files.length,
    });

    const limitedFiles = files.slice(0, env.maxFilesPerPr);
    if (files.length > env.maxFilesPerPr) {
      scopedLogger.warn("PR file count exceeded configured maximum", {
        maxFilesPerPr: env.maxFilesPerPr,
        originalFiles: files.length,
      });
    }

    const analysisResult = dependencies.runStaticAnalysis(limitedFiles, {
      allowedExtensions: [".js", ".jsx", ".ts", ".tsx"],
      maxFilePatchBytes: env.maxFilePatchKb * 1024,
      maxAstInputBytes: env.maxAstInputKb * 1024,
      maxIssuesPerFile: env.maxIssuesPerFile,
    });

    scopedLogger.info("Files analyzed", {
      analyzedFiles: analysisResult.astMetadata.length,
      issuesDetected: analysisResult.issues.length,
    });

    for (const warning of analysisResult.warnings) {
      scopedLogger.warn("Analysis warning", { warning });
    }

    let aiMode: "success" | "partial-fallback" | "fallback" = "fallback";
    let reviewId: string | undefined;
    if (analysisResult.issues.length > 0) {
      const aiReview = await dependencies.generateAiReview({
        metadata,
        issues: analysisResult.issues,
      });

      aiMode = aiReview.aiStatus;
      scopedLogger.info("AI mode selected", {
        aiMode,
      });

      const body = dependencies.formatReviewComment({
        metadata,
        aiReview,
      });

      const inlineComments = aiReview.enrichedIssues.map((issue) => ({
        path: issue.filePath,
        line: issue.line,
        body: [
          `Rule: ${issue.ruleId}`,
          `Severity: ${issue.severity}`,
          `Explanation: ${issue.explanation}`,
          `Recommendation: ${issue.recommendation}`,
        ].join("\n"),
      }));

      try {
        reviewId = await dependencies.postPullRequestReviewComment({
          octokit,
          owner: metadata.owner,
          repo: metadata.repo,
          pullNumber: metadata.pullNumber,
          summaryBody: body,
          inlineComments,
          enableInlineMode: env.githubInlineReviewMode,
        });
      } catch (error) {
        if (error instanceof GitHubError) {
          scopedLogger.error("Review posting failed after retries", {
            errorCode: error.code,
            message: error.message,
          });
        } else {
          scopedLogger.error("Unexpected review posting failure", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const severityCounts = dependencies.reviewRepository.countSeverities(analysisResult.issues.map((issue) => issue.severity));

    if (!metadata.repositoryId) {
      throw new WebhookError("Missing repository ID in pull request payload", {
        owner: metadata.owner,
        repo: metadata.repo,
      });
    }

    const repositoryId = metadata.repositoryId;

    await dependencies.withTransaction(async (db) => {
      const repositoryRecord = await dependencies.repositoryRepository.upsert(
        {
          githubRepoId: repositoryId,
          owner: metadata.owner,
          name: metadata.repo,
        },
        db
      );

      const pullRequestRecord = await dependencies.prRepository.upsert(
        {
          repositoryId: repositoryRecord.id,
          githubPrId: metadata.githubPrId,
          number: metadata.pullNumber,
          title: metadata.title,
          author: metadata.author ?? "unknown",
          status: metadata.pullRequestState,
          headSha: metadata.headSha,
          baseSha: metadata.baseSha,
          mergedAt: metadata.mergedAt,
        },
        db
      );

      const reviewRun = await dependencies.reviewRepository.create(
        {
          pullRequestId: pullRequestRecord.id,
          headSha: metadata.headSha,
          totalIssues: analysisResult.issues.length,
          highCount: severityCounts.highCount,
          mediumCount: severityCounts.mediumCount,
          lowCount: severityCounts.lowCount,
          aiMode,
          reviewId,
        },
        db
      );

      await dependencies.issueRepository.insertMany(reviewRun.id, analysisResult.issues, db);
    });

    if (analysisResult.issues.length === 0) {
      await dependencies.webhookRepository.updateStatus(correlationId, "success");
      return {
        skipped: true,
        reason: "No issues detected",
        metadata,
        issueCount: 0,
      };
    }

    if (!reviewId) {
      await dependencies.webhookRepository.updateStatus(correlationId, "failed", "Review post skipped after retries");
      return {
        skipped: true,
        reason: "Review post skipped after retries",
        metadata,
        issueCount: analysisResult.issues.length,
        aiMode,
      };
    }

    scopedLogger.info("Review posted", {
      reviewId,
      issueCount: analysisResult.issues.length,
    });

    await dependencies.webhookRepository.updateStatus(correlationId, "success");

    return {
      skipped: false,
      metadata,
      issueCount: analysisResult.issues.length,
      aiMode,
      reviewId,
    };
  } catch (error) {
    if (error instanceof AIProviderError) {
      scopedLogger.warn("AI provider failure handled with fallback", {
        message: error.message,
      });
    } else if (error instanceof GitHubError) {
      scopedLogger.error("GitHub processing failed", {
        errorCode: error.code,
        message: error.message,
      });
    } else {
      scopedLogger.error("Unhandled processing failure", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    await dependencies.webhookRepository.updateStatus(
      correlationId,
      "failed",
      error instanceof Error ? error.message : "Unknown processing error"
    );

    return {
      skipped: true,
      reason: "Processing failed gracefully",
      metadata,
    };
  }
}
