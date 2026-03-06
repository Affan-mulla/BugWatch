import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function OAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const completeOAuth = useAuthStore((state) => state.completeOAuth);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      navigate("/login", { replace: true });
      return;
    }

    void completeOAuth(code, state)
      .then(() => {
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [completeOAuth, navigate, params]);

  return <div className="p-6 text-sm text-muted-foreground">Completing GitHub authentication...</div>;
}
