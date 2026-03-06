import type { Request, Response } from "express";
import { getHealthStatus } from "../services/healthService.js";

let appBooted = false;

export function setAppBooted(value: boolean): void {
  appBooted = value;
}

export async function getHealth(_req: Request, res: Response): Promise<Response> {
  const status = await getHealthStatus(appBooted);
  const httpCode = status.ok ? 200 : 503;
  return res.status(httpCode).json(status);
}
