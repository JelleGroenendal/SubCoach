import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAUpdatePrompt(): React.ReactNode {
  const { t } = useTranslation();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(
      _swUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) {
      // Check for updates every hour
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error: Error) {
      console.error("SW registration error:", error);
    },
  });

  // Derive show state from needRefresh
  const showPrompt = useMemo(() => needRefresh, [needRefresh]);

  const handleUpdate = (): void => {
    updateServiceWorker(true);
  };

  const handleDismiss = (): void => {
    setNeedRefresh(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
        "rounded-xl border border-border bg-card p-4 shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-300",
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-medium text-foreground">
            {t("pwa.updateAvailable")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pwa.updateDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          aria-label={t("common.dismiss")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "min-h-12 flex-1 rounded-lg border border-border px-4 py-2",
            "touch-manipulation text-sm font-medium text-muted-foreground",
            "hover:bg-accent",
          )}
          aria-label={t("pwa.later")}
        >
          {t("pwa.later")}
        </button>
        <button
          type="button"
          onClick={handleUpdate}
          className={cn(
            "min-h-12 flex-1 rounded-lg bg-primary px-4 py-2",
            "touch-manipulation text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
          )}
          aria-label={t("pwa.update")}
        >
          {t("pwa.update")}
        </button>
      </div>
    </div>
  );
}
