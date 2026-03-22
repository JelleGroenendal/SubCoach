import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/lib/pwa";

// Check if dismissed recently (called once at module load, not during render)
function checkDismissedRecently(): boolean {
  const dismissedTime = localStorage.getItem("pwa_install_dismissed");
  if (!dismissedTime) return false;
  const parsed = parseInt(dismissedTime, 10);
  return Date.now() - parsed < 7 * 24 * 60 * 60 * 1000;
}

export function InstallPrompt(): React.ReactNode {
  const { t } = useTranslation();
  const { isInstalled, isInstallable, install } = usePWAInstall();
  // Initialize dismissed state based on localStorage (evaluated once)
  const [dismissed, setDismissed] = useState(() => checkDismissedRecently());

  // Derive showBanner from state (no useEffect needed)
  const showBanner = isInstallable && !isInstalled && !dismissed;

  const handleInstall = useCallback(async (): Promise<void> => {
    const success = await install();
    if (success) {
      setDismissed(true);
    }
  }, [install]);

  const handleDismiss = useCallback((): void => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border bg-card p-4 shadow-lg",
        "animate-in slide-in-from-bottom duration-300",
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-4">
        <div className="flex-1">
          <p className="font-medium text-foreground">
            {t("pwa.install.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("pwa.install.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              "min-h-12 touch-manipulation rounded-lg px-4 py-2",
              "text-sm font-medium text-muted-foreground",
              "transition-colors hover:text-foreground",
            )}
          >
            {t("pwa.install.later")}
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className={cn(
              "min-h-12 touch-manipulation rounded-lg bg-primary px-4 py-2",
              "text-sm font-medium text-primary-foreground",
              "transition-colors hover:bg-primary/90",
            )}
          >
            {t("pwa.install.button")}
          </button>
        </div>
      </div>
    </div>
  );
}
