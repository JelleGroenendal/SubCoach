import { useCallback, useEffect, useRef, useState } from "react";
import { p2pSync } from "./p2pSync";
import { getTeamDoc, waitForTeamSync } from "@/data/yjs/yjsProvider";
import { getTeamRefs, addTeamRef, setActiveTeamId } from "@/data/yjs/appDoc";
import { getTeamInfo } from "@/data/yjs/teamDoc";
import type { TeamRef } from "@/data/schemas";

interface TeamSyncState {
  roomCode: string | null;
  peerCount: number;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  mode: "idle" | "hosting" | "joining";
  teamImported: boolean;
}

interface TeamSyncHook extends TeamSyncState {
  /** Host a room to share a team with others */
  hostTeamShare: (teamId: string) => Promise<string>;
  /** Join a room to receive a shared team */
  joinTeamShare: (roomCode: string) => Promise<string | null>;
  /** Disconnect from the sync room */
  disconnect: () => void;
}

/**
 * Hook for sharing teams between coaches via P2P sync.
 *
 * When hosting: shares the team's Yjs doc with peers
 * When joining: receives the team data and imports it to the local app
 */
export function useTeamSync(): TeamSyncHook {
  const [state, setState] = useState<TeamSyncState>(() => {
    const s = p2pSync.getState();
    return {
      roomCode: s.roomCode,
      peerCount: s.peerCount,
      isConnecting: s.isConnecting,
      isConnected: s.isConnected,
      error: s.error,
      mode: "idle",
      teamImported: false,
    };
  });

  // Track the team ID we're syncing (for joining)
  const syncingTeamIdRef = useRef<string | null>(null);
  const importCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Subscribe to p2pSync state changes
  useEffect(() => {
    return p2pSync.subscribe((newState) => {
      setState((prev) => ({
        ...prev,
        roomCode: newState.roomCode,
        peerCount: newState.peerCount,
        isConnecting: newState.isConnecting,
        isConnected: newState.isConnected,
        error: newState.error,
      }));
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (importCheckIntervalRef.current) {
        clearInterval(importCheckIntervalRef.current);
      }
    };
  }, []);

  /**
   * Host a room to share a team with other coaches.
   * Returns the room code that others can use to join.
   */
  const hostTeamShare = useCallback(async (teamId: string): Promise<string> => {
    setState((prev) => ({ ...prev, mode: "hosting", teamImported: false }));

    // Get or create the team doc
    const doc = getTeamDoc(teamId);
    await waitForTeamSync(teamId);

    // Debug: log what's in the doc we're about to share
    const infoMap = doc.getMap("info");
    const playersMap = doc.getMap("players");
    console.log(
      "[TeamSync] Hosting team doc - info size:",
      infoMap.size,
      "players size:",
      playersMap.size,
    );
    if (infoMap.size > 0) {
      console.log(
        "[TeamSync] Host doc info contents:",
        Object.fromEntries(infoMap.entries()),
      );
    }

    // Host the room
    const roomCode = await p2pSync.hostRoom(doc);

    return roomCode;
  }, []);

  /**
   * Join a room to receive a shared team.
   * Returns the team ID once the team has been imported, or null on failure.
   */
  const joinTeamShare = useCallback(
    async (roomCode: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, mode: "joining", teamImported: false }));

      // Generate a temporary team ID for the incoming data
      // We'll use this to create the local Yjs doc that receives the sync
      const tempTeamId = crypto.randomUUID();
      syncingTeamIdRef.current = tempTeamId;

      // Get or create a team doc for the incoming data
      const doc = getTeamDoc(tempTeamId);

      // Wait for local IndexedDB sync to complete before joining P2P room
      // This ensures the doc is ready to receive remote updates
      await waitForTeamSync(tempTeamId);
      console.log("[TeamSync] Local doc ready, joining room...");

      try {
        // Debug: log when doc receives updates
        doc.on("update", (update: Uint8Array, origin: unknown) => {
          console.log(
            "[TeamSync] Doc received update, size:",
            update.length,
            "origin:",
            origin,
          );
          // Check what's in the doc now
          const infoMap = doc.getMap("info");
          const playersMap = doc.getMap("players");
          console.log(
            "[TeamSync] Doc info map size:",
            infoMap.size,
            "players map size:",
            playersMap.size,
          );
          if (infoMap.size > 0) {
            console.log(
              "[TeamSync] Info map contents:",
              Object.fromEntries(infoMap.entries()),
            );
          }
          if (playersMap.size > 0) {
            console.log(
              "[TeamSync] Players map keys:",
              Array.from(playersMap.keys()),
            );
          }
        });

        // Also log initial state of the doc
        console.log(
          "[TeamSync] Initial doc state - info size:",
          doc.getMap("info").size,
          "players size:",
          doc.getMap("players").size,
        );

        // Join the room to start receiving data
        await p2pSync.joinRoom(roomCode, doc);

        // Wait for the team data to arrive
        // We poll the doc until we see team info
        return new Promise<string | null>((resolve) => {
          let attempts = 0;
          const maxAttempts = 120; // 60 seconds max wait (A6: extended from 30s)

          importCheckIntervalRef.current = setInterval(async () => {
            attempts++;

            // Check if we've received team info
            const teamInfo = getTeamInfo(tempTeamId);

            // Log progress periodically (every 5 seconds)
            if (attempts % 10 === 1) {
              const infoMap = doc.getMap("info");
              const playersMap = doc.getMap("players");
              console.log(
                "[TeamSync] Checking for team data, attempt",
                attempts,
                "infoMap.size:",
                infoMap.size,
                "playersMap.size:",
                playersMap.size,
                "teamInfo:",
                teamInfo,
              );
            }

            if (teamInfo && teamInfo.name) {
              // Team data has arrived! Import it to our app
              clearInterval(importCheckIntervalRef.current!);
              importCheckIntervalRef.current = null;

              // Check if this team already exists in our team refs
              const existingRefs = getTeamRefs();
              const alreadyExists = existingRefs.some(
                (ref) => ref.id === teamInfo.id,
              );

              if (!alreadyExists) {
                // Add the team reference to our app
                const teamRef: TeamRef = {
                  id: teamInfo.id,
                  name: teamInfo.name,
                  sportProfileId: teamInfo.sportProfileId,
                  createdAt: teamInfo.createdAt,
                };
                addTeamRef(teamRef);
              }

              // Set as active team
              setActiveTeamId(teamInfo.id);

              setState((prev) => ({ ...prev, teamImported: true }));
              resolve(teamInfo.id);
            } else if (attempts >= maxAttempts) {
              // Timeout - no data received
              clearInterval(importCheckIntervalRef.current!);
              importCheckIntervalRef.current = null;
              setState((prev) => ({
                ...prev,
                error: "Timeout waiting for team data",
              }));
              resolve(null);
            }
          }, 500);
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to join room",
        }));
        return null;
      }
    },
    [],
  );

  /**
   * Disconnect from the sync room
   */
  const disconnect = useCallback(() => {
    if (importCheckIntervalRef.current) {
      clearInterval(importCheckIntervalRef.current);
      importCheckIntervalRef.current = null;
    }
    syncingTeamIdRef.current = null;
    p2pSync.disconnect();
    setState((prev) => ({
      ...prev,
      mode: "idle",
      teamImported: false,
    }));
  }, []);

  return {
    ...state,
    hostTeamShare,
    joinTeamShare,
    disconnect,
  };
}
