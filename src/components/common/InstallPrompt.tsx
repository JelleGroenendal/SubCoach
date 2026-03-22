import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "subcoach-install-dismissed";

export function InstallPrompt(): React.ReactNode {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) === "true";
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  }, []);

  // Don't show if dismissed, no prompt available, or already installed
  if (dismissed || !installPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-lg",
        "sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border",
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {t("pwa.installTitle")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("pwa.installDescription")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-10 touch-manipulation px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("pwa.later")}
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="min-h-10 touch-manipulation rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("pwa.install")}
        </button>
      </div>
    </div>
  );
}
