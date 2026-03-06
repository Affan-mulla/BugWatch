export function normalizeDeliveryId(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function buildReviewRunKey(repo: string, prNumber: number, sha: string): string {
  return `${repo.toLowerCase()}#${prNumber}:${sha}`;
}
