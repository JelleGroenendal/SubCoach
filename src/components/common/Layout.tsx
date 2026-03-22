import { Outlet, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { TeamSelector } from "./TeamSelector";
import { CrashRecovery } from "./CrashRecovery";
import { InstallPrompt } from "./InstallPrompt";
import { SyncIndicator } from "./SyncIndicator";

const NAV_ITEMS = [
  {
    path: "/",
    labelKey: "nav.home",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    path: "/history",
    labelKey: "nav.history",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
  },
  {
    path: "/stats",
    labelKey: "nav.stats",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="M7 16l4-8 4 4 6-8" />
      </svg>
    ),
  },
  {
    path: "/settings",
    labelKey: "nav.settings",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
] as const;

const HIDDEN_NAV_PREFIXES = ["/match/live", "/match/setup"];

export function Layout(): React.ReactNode {
  const { t } = useTranslation();
  const location = useLocation();

  const isFullScreen = location.pathname.startsWith("/match/live");
  const hideNav = HIDDEN_NAV_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  if (isFullScreen) {
    return (
      <main className="h-screen w-screen overflow-hidden">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CrashRecovery />

      {/* Desktop header - hidden on mobile */}
      {!hideNav && (
        <header className="hidden border-b border-border px-4 py-3 sm:block">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="min-h-12 touch-manipulation text-xl font-bold text-foreground"
                aria-label={t("nav.home")}
              >
                SubCoach
              </Link>
              <TeamSelector />
              <SyncIndicator />
            </div>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "min-h-12 min-w-12 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "flex items-center justify-center",
                    location.pathname === item.path
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-current={
                    location.pathname === item.path ? "page" : undefined
                  }
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}

      {/* Mobile header - simplified, shown on mobile only */}
      {!hideNav && (
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
          <Link
            to="/"
            className="min-h-12 touch-manipulation text-xl font-bold text-foreground"
            aria-label={t("nav.home")}
          >
            SubCoach
          </Link>
          <div className="flex items-center gap-2">
            <SyncIndicator />
            <TeamSelector />
          </div>
        </header>
      )}

      {/* Main content - extra padding at bottom for mobile nav */}
      <main
        className={cn(
          "mx-auto w-full max-w-4xl flex-1 p-4",
          !hideNav && "pb-24 sm:pb-8",
        )}
      >
        <Outlet />
      </main>

      {/* Mobile bottom navigation bar */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background sm:hidden">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex min-h-16 flex-1 touch-manipulation flex-col items-center justify-center gap-1 py-2 transition-colors",
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                aria-current={
                  location.pathname === item.path ? "page" : undefined
                }
                aria-label={t(item.labelKey)}
              >
                {item.icon}
                <span className="text-xs font-medium">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>
          {/* Safe area padding for devices with home indicator */}
          <div className="h-safe-area-inset-bottom bg-background" />
        </nav>
      )}

      <InstallPrompt />
    </div>
  );
}
