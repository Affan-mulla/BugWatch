import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
        <div className="space-y-2">
          <p className="font-medium text-destructive">{title}</p>
          <p className="text-muted-foreground">{message}</p>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
