import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <div className="flex items-center gap-2 px-1">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <Switch
        aria-label="Toggle theme"
        checked={mode === "dark"}
        onCheckedChange={() => toggleTheme()}
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
