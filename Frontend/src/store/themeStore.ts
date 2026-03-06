import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "ai-pr-review-theme";

function readStoredTheme(): ThemeMode | null {
  const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === "light" || storedValue === "dark") {
    return storedValue;
  }
  return null;
}

function resolvePreferredTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme: ThemeMode): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function persistTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

interface ThemeState {
  mode: ThemeMode;
  initializeTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",

  initializeTheme: () => {
    const mode = readStoredTheme() ?? resolvePreferredTheme();
    applyThemeClass(mode);
    set({ mode });
  },

  setTheme: (mode) => {
    applyThemeClass(mode);
    persistTheme(mode);
    set({ mode });
  },

  toggleTheme: () => {
    const nextTheme: ThemeMode = get().mode === "dark" ? "light" : "dark";
    applyThemeClass(nextTheme);
    persistTheme(nextTheme);
    set({ mode: nextTheme });
  },
}));
