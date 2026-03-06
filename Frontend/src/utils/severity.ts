import type { Severity } from "@/types/domain";

export function severityOrder(severity: Severity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

export function severityBadgeClass(severity: Severity): string {
  if (severity === "high") return "bg-destructive/10 text-destructive border-destructive/20";
  if (severity === "medium") return "bg-chart-1/10 text-chart-1 border-chart-1/20";
  return "bg-chart-4/10 text-chart-4 border-chart-4/20";
}
