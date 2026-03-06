import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ServerErrorPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold">500 - Server Error</h1>
      <p className="max-w-md text-sm text-muted-foreground">The server encountered an error while processing this request.</p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
