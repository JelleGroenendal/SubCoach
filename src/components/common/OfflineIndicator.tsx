import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function OfflineIndicator(): React.ReactNode {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOffline(false);
      // Show "back online" briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = (): void => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't show anything if online and banner not visible
  if (!isOffline && !showBanner) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "flex items-center justify-center px-4 py-2",
        "text-sm font-medium",
        "animate-in slide-in-from-top duration-300",
        isOffline
          ? "bg-amber-500/90 text-amber-950"
          : "bg-emerald-500/90 text-emerald-950",
      )}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
            aria-hidden="true"
          >
            <path d="M2 12 7 2" />
            <path d="m7 12 5-10" />
            <path d="m12 12 5-10" />
            <path d="m17 12 5-10" />
            <path d="M4.5 12h15" />
            <path d="m2 12 5 10" />
            <path d="m7 12 5 10" />
            <path d="m12 12 5 10" />
            <path d="m17 12 5 10" />
          </svg>
          {t("offline.offline")}
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" />
          </svg>
          {t("offline.online")}
        </>
      )}
    </div>
  );
}
