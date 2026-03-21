import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", labelKey: "nav.home" },
  { path: "/history", labelKey: "nav.history" },
  { path: "/settings", labelKey: "nav.settings" },
] as const;

export function Layout(): React.ReactNode {
  const { t } = useTranslation();
  const location = useLocation();
  const isMatchMode = location.pathname.startsWith("/match/live");

  // In match mode, hide navigation to maximize screen space
  if (isMatchMode) {
    return (
      <main className="h-screen w-screen overflow-hidden">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">
            SubCoach
          </Link>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "min-h-12 min-w-12 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
