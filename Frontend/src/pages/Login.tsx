import { Github } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getGithubLoginUrl } from "@/api/authApi";

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectUrl = await getGithubLoginUrl();
      window.location.href = redirectUrl;
    } catch {
      setError("GitHub sign-in is currently unavailable. Please verify backend auth configuration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Github className="mx-auto h-10 w-10" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Automated PR Review System
          </h1>
          <p className="text-sm text-muted-foreground">
            Deterministic static analysis with AI-powered explanations
          </p>
        </div>
        <div className="grid gap-6">
          <Button className="w-full" onClick={() => void handleLogin()} disabled={isLoading}>
            {isLoading ? (
              "Redirecting..."
            ) : (
              <>
                <Github className="mr-2 h-4 w-4" />
                Continue with GitHub
              </>
            )}
          </Button>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
