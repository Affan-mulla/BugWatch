import { create } from "zustand";
import { exchangeGithubCode, getCurrentSession, logout } from "@/api/authApi";
import { setStoredToken, setUnauthorizedHandler } from "@/api/httpClient";
import type { User } from "@/types/domain";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  completeOAuth: (code: string, state: string) => Promise<void>;
  clearError: () => void;
  logout: () => Promise<void>;
  forceLogout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      const session = await getCurrentSession();
      setStoredToken(session.token);
      set({
        token: session.token,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      setStoredToken(null);
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  completeOAuth: async (code: string, state: string) => {
    set({ isLoading: true, error: null });

    try {
      const session = await exchangeGithubCode(code, state);
      setStoredToken(session.token);
      set({
        token: session.token,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to complete authentication",
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  logout: async () => {
    try {
      await logout();
    } finally {
      setStoredToken(null);
      set({ token: null, user: null, isAuthenticated: false, error: null });
    }
  },

  forceLogout: () => {
    setStoredToken(null);
    set({ token: null, user: null, isAuthenticated: false, error: null });
  },
}));

setUnauthorizedHandler(() => {
  useAuthStore.getState().forceLogout();
});
