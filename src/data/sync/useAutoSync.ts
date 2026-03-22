import { useEffect, useRef } from "react";
import { p2pSync } from "./p2pSync";
import { getTeamDoc } from "@/data/yjs/yjsProvider";
import { getSyncRoomCode } from "@/data/yjs";

/**
 * Hook that automatically connects to P2P sync if the team has a saved sync room code.
 * Should be used once at the app level (e.g., in providers).
 *
 * @param teamId - The active team ID to sync
 */
export function useAutoSync(teamId: string | undefined): void {
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      return;
    }

    // Don't attempt to reconnect for the same team twice in one session
    if (attemptedRef.current === teamId) {
      return;
    }

    // Check if team has a saved sync room code
    const syncRoomCode = getSyncRoomCode(teamId);
    if (!syncRoomCode) {
      return;
    }

    // Mark as attempted to prevent duplicate connection attempts
    attemptedRef.current = teamId;

    // Get the team's Yjs document
    const doc = getTeamDoc(teamId);

    // Auto-connect (with exponential backoff retry on failure)
    p2pSync.autoConnect(syncRoomCode, doc).catch((error: unknown) => {
      // Error is handled internally by p2pSync (schedules retries)
      console.warn("[AutoSync] Initial connection failed, retrying...", error);
    });

    // Cleanup: disconnect when team changes or component unmounts
    return () => {
      // Don't disconnect here - we want to maintain the connection
      // The connection will be cleaned up when disableSync is called
      // or when the user manually disconnects
    };
  }, [teamId]);
}

/**
 * Hook to listen for disconnect events and show notifications.
 * Returns a callback to clear the notification.
 */
export function useDisconnectNotification(
  onPeerDisconnect: () => void,
): () => void {
  useEffect(() => {
    return p2pSync.onDisconnect((reason) => {
      if (reason === "peer_left") {
        onPeerDisconnect();
      }
    });
  }, [onPeerDisconnect]);

  // Return a no-op cleanup function
  return () => {};
}
