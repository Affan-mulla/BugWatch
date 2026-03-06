import type { NextFunction, Request, Response } from "express";
import { sessionRepository } from "../repositories/sessionRepository.js";
import { userRepository } from "../repositories/userRepository.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    token: string;
    userId: number;
    githubAccessToken: string;
    username: string;
    avatarUrl: string | null;
  };
}

function extractBearerToken(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing bearer token",
      },
    });
  }

  const session = await sessionRepository.findValidByToken(token);
  if (!session) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Session expired or invalid",
      },
    });
  }

  const user = await userRepository.findById(session.userId);
  if (!user) {
    await sessionRepository.deleteByToken(token);
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Session user not found",
      },
    });
  }

  req.auth = {
    token,
    userId: user.id,
    githubAccessToken: session.githubAccessToken,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };

  next();
}
