export function registerPWA(): void {
  // PWA registration is handled by vite-plugin-pwa
  // This file provides utilities for PWA-related features

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // Service worker is auto-registered by vite-plugin-pwa
    });
  }
}

export function requestWakeLock(): (() => void) | undefined {
  if ("wakeLock" in navigator) {
    let wakeLock: WakeLockSentinel | null = null;

    const acquire = async (): Promise<void> => {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch {
        // Wake lock request failed (e.g. low battery)
      }
    };

    acquire();

    // Re-acquire on visibility change (tab becomes active again)
    const handleVisibility = (): void => {
      if (document.visibilityState === "visible" && !wakeLock) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }

  return undefined;
}
