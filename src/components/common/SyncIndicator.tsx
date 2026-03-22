import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { p2pSync } from "@/data/sync/p2pSync";
import type { SyncStatus } from "@/data/sync/p2pSync";

interface SyncState {
  status: SyncStatus;
  peerCount: number;
  nextRetryIn: number | null;
  roomCode: string | null;
}

/**
 * Compact sync status indicator for the header.
 * Shows connection status with peer count and retry countdown.
 */
export function SyncIndicator(): React.ReactNode {
  const { t } = useTranslation();
  const [state, setState] = useState<SyncState>(() => {
    const s = p2pSync.getState();
    return {
      status: s.status,
      peerCount: s.peerCount,
      nextRetryIn: s.nextRetryIn,
      roomCode: s.roomCode,
    };
  });

  useEffect(() => {
    return p2pSync.subscribe((newState) => {
      setState({
        status: newState.status,
        peerCount: newState.peerCount,
        nextRetryIn: newState.nextRetryIn,
        roomCode: newState.roomCode,
      });
    });
  }, []);

  // Don't show anything if disconnected and no room code (sync not enabled)
  if (state.status === "disconnected" && !state.roomCode) {
    return null;
  }

  const getStatusIcon = (): React.ReactNode => {
    switch (state.status) {
      case "connected":
        return (
          <span
            className="inline-block h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
        );
      case "connecting":
      case "reconnecting":
        return (
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500"
            aria-hidden="true"
          />
        );
      case "error":
        return (
          <span
            className="inline-block h-2 w-2 rounded-full bg-red-500"
            aria-hidden="true"
          />
        );
      case "disconnected":
      default:
        return (
          <span
            className="inline-block h-2 w-2 rounded-full bg-zinc-500"
            aria-hidden="true"
          />
        );
    }
  };

  const getStatusText = (): string => {
    switch (state.status) {
      case "connected":
        if (state.peerCount > 0) {
          return t("syncIndicator.connectedPeers", { count: state.peerCount });
        }
        return t("syncIndicator.waiting");
      case "connecting":
        return t("syncIndicator.connecting");
      case "reconnecting":
        if (state.nextRetryIn !== null && state.nextRetryIn > 0) {
          return t("syncIndicator.retryingIn", { seconds: state.nextRetryIn });
        }
        return t("syncIndicator.reconnecting");
      case "error":
        return t("syncIndicator.error");
      case "disconnected":
      default:
        return t("syncIndicator.disconnected");
    }
  };

  const getAriaLabel = (): string => {
    switch (state.status) {
      case "connected":
        if (state.peerCount > 0) {
          return t("syncIndicator.ariaConnected", { count: state.peerCount });
        }
        return t("syncIndicator.ariaWaiting");
      case "connecting":
        return t("syncIndicator.ariaConnecting");
      case "reconnecting":
        return t("syncIndicator.ariaReconnecting");
      case "error":
        return t("syncIndicator.ariaError");
      case "disconnected":
      default:
        return t("syncIndicator.ariaDisconnected");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-1",
        "text-xs font-medium",
        "bg-zinc-800/50",
        state.status === "connected" &&
          state.peerCount > 0 &&
          "bg-emerald-900/30",
        state.status === "error" && "bg-red-900/30",
      )}
      role="status"
      aria-label={getAriaLabel()}
    >
      {getStatusIcon()}
      <span className="hidden sm:inline">{getStatusText()}</span>
      {/* On mobile, only show icon + peer count when connected */}
      {state.status === "connected" && state.peerCount > 0 && (
        <span className="sm:hidden">{state.peerCount}</span>
      )}
    </div>
  );
}
