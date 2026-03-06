import { checkDatabaseHealth } from "../db/client.js";

export interface HealthStatus {
  ok: boolean;
  appBooted: boolean;
  database: "up" | "down";
}

export async function getHealthStatus(appBooted: boolean): Promise<HealthStatus> {
  const dbHealthy = await checkDatabaseHealth();

  return {
    ok: appBooted && dbHealthy,
    appBooted,
    database: dbHealthy ? "up" : "down",
  };
}
