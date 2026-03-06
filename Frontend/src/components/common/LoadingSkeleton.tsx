export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}
