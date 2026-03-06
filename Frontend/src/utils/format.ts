export function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return "Never";

  const now = Date.now();
  const timestamp = new Date(isoDate).getTime();
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(isoDate).toLocaleDateString();
}

export function capitalize(value: string): string {
  if (!value.length) return value;
  return value[0].toUpperCase() + value.slice(1);
}
