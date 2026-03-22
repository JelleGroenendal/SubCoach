import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global state for the install prompt (shared between components)
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

// Initialize the beforeinstallprompt listener once
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone ===
        true)
  );
}

export interface PWAInstallState {
  isInstalled: boolean;
  isInstallable: boolean;
  install: () => Promise<boolean>;
  clearDismissed: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = (): void => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      deferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  }, []);

  const clearDismissed = useCallback((): void => {
    localStorage.removeItem("pwa_install_dismissed");
  }, []);

  return {
    isInstalled: isPWAInstalled(),
    isInstallable: deferredPrompt !== null,
    install,
    clearDismissed,
  };
}

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
