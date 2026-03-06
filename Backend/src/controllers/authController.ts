import type { Request, Response } from "express";
import { createOAuthRedirectUrl, createSessionFromOAuthCode } from "../services/authService.js";
import { sessionRepository } from "../repositories/sessionRepository.js";
import type { AuthenticatedRequest } from "../middleware/requireAuth.js";

interface OAuthExchangeBody {
  code?: string;
  state?: string;
}

export async function getGithubLoginUrl(req: Request, res: Response): Promise<Response> {
  const redirectPath = typeof req.query.redirectPath === "string" ? req.query.redirectPath : undefined;
  const redirectUrl = createOAuthRedirectUrl(redirectPath);
  return res.status(200).json({ redirectUrl });
}

export async function exchangeGithubCode(req: Request, res: Response): Promise<Response> {
  const body = req.body as OAuthExchangeBody;

  if (!body.code || !body.state) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Missing code or state",
      },
    });
  }

  const session = await createSessionFromOAuthCode(body.code, body.state);
  return res.status(200).json(session);
}

export async function getCurrentSession(req: AuthenticatedRequest, res: Response): Promise<Response> {
  if (!req.auth) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      },
    });
  }

  return res.status(200).json({
    token: req.auth.token,
    user: {
      id: String(req.auth.userId),
      username: req.auth.username,
      avatarUrl: req.auth.avatarUrl ?? "",
    },
  });
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<Response> {
  if (req.auth?.token) {
    await sessionRepository.deleteByToken(req.auth.token);
  }

  return res.status(204).send();
}
