import { Link } from "react-router-dom";
import { Search, Settings, Github, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Github className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              AI PR Review
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search repositories or PRs... (Cmd+K)"
                className="h-9 w-full pl-9 md:w-[300px] lg:w-[400px]"
              />
            </div>
          </div>
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void logout()}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Log out</span>
            </Button>
            <div className="h-8 w-8 rounded-full bg-muted border border-border overflow-hidden">
              <img src={user?.avatarUrl ?? "https://github.com/ghost.png"} alt="User Avatar" className="h-full w-full object-cover" />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
