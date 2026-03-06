import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, GitPullRequest, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

interface SidebarProps {
  repositoryId?: string;
}

export function Sidebar({ repositoryId }: SidebarProps) {
  const location = useLocation();
  const selectedRepositoryId = useAppStore((state) => state.selectedRepositoryId);
  const repositories = useAppStore((state) => state.repositories);

  const activeRepositoryId = repositoryId ?? selectedRepositoryId;
  const activeRepository = repositories.find((repo) => repo.id === activeRepositoryId);

  const navItems = [
    {
      title: "Overview",
      href: activeRepositoryId ? `/repository/${activeRepositoryId}` : "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Pull Requests",
      href: activeRepositoryId ? `/repository/${activeRepositoryId}/prs` : "/prs",
      icon: GitPullRequest,
    },
    {
      title: "Metrics & Trends",
      href: activeRepositoryId ? `/repository/${activeRepositoryId}/metrics` : "/metrics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: activeRepositoryId ? `/repository/${activeRepositoryId}/settings` : "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block md:w-64 border-r border-border bg-background">
      <div className="h-full py-6 pl-8 pr-6">
        {activeRepositoryId && (
          <div className="mb-6 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Repository
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {activeRepository?.fullName ?? activeRepositoryId}
            </p>
          </div>
        )}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-4 w-4 flex-shrink-0",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
