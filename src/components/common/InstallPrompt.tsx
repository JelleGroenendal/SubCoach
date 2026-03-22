import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt(): React.ReactNode {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed recently
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = (): void => {
    setShowBanner(false);
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

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
