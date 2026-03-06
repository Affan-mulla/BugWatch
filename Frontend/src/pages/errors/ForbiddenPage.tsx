import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold">403 - Forbidden</h1>
      <p className="max-w-md text-sm text-muted-foreground">You do not have permission to access this resource.</p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
