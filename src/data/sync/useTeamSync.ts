import { useCallback, useEffect, useRef, useState } from "react";
import { p2pSync } from "./p2pSync";
import { getTeamDoc, waitForTeamSync } from "@/data/yjs/yjsProvider";
import { getTeamRefs, addTeamRef, setActiveTeamId } from "@/data/yjs/appDoc";
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
   *
   * IMPORTANT: For continuous sync, we need both devices to use the SAME Yjs doc.
   * The approach:
   * 1. Join with a temp doc to receive the team ID
   * 2. Once we know the real team ID, disconnect and reconnect with the real doc
   * 3. This ensures both host and joiner are syncing the same doc
   */
  const joinTeamShare = useCallback(
    async (roomCode: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, mode: "joining", teamImported: false }));

      // Generate a temporary team ID for initial data reception
      const tempTeamId = crypto.randomUUID();
      syncingTeamIdRef.current = tempTeamId;

      // Get or create a temp doc for initial sync
      const tempDoc = getTeamDoc(tempTeamId);
      await waitForTeamSync(tempTeamId);
      console.log("[TeamSync] Local temp doc ready, joining room...");

      try {
        // Debug: log when doc receives updates
        tempDoc.on("update", (update: Uint8Array, origin: unknown) => {
          console.log(
            "[TeamSync] Temp doc received update, size:",
            update.length,
            "origin:",
            origin,
          );
          const infoMap = tempDoc.getMap("info");
          const playersMap = tempDoc.getMap("players");
          console.log(
            "[TeamSync] Temp doc info map size:",
            infoMap.size,
            "players map size:",
            playersMap.size,
          );
        });

        console.log(
          "[TeamSync] Initial temp doc state - info size:",
          tempDoc.getMap("info").size,
          "players size:",
          tempDoc.getMap("players").size,
        );

        // Join the room to start receiving data
        await p2pSync.joinRoom(roomCode, tempDoc);

        // Wait for the team data to arrive
        return new Promise<string | null>((resolve) => {
          let attempts = 0;
          const maxAttempts = 120; // 60 seconds max wait

          importCheckIntervalRef.current = setInterval(async () => {
            attempts++;

            const infoMap = tempDoc.getMap("info");
            const playersMap = tempDoc.getMap("players");
            const receivedTeamId = infoMap.get("id") as string | undefined;
            const receivedTeamName = infoMap.get("name") as string | undefined;

            if (attempts % 10 === 1) {
              console.log(
                "[TeamSync] Checking for team data, attempt",
                attempts,
                "infoMap.size:",
                infoMap.size,
                "playersMap.size:",
                playersMap.size,
                "receivedTeamId:",
                receivedTeamId,
              );
            }

            if (receivedTeamId && receivedTeamName) {
              clearInterval(importCheckIntervalRef.current!);
              importCheckIntervalRef.current = null;

              console.log(
                "[TeamSync] Team data received! ID:",
                receivedTeamId,
                "Name:",
                receivedTeamName,
              );

              // Step 1: Copy data to the real team doc (for local persistence)
              const realTeamDoc = getTeamDoc(receivedTeamId);
              await waitForTeamSync(receivedTeamId);

              // Copy all data from temp doc to real doc
              const realInfoMap = realTeamDoc.getMap("info");
              realTeamDoc.transact(() => {
                infoMap.forEach((value, key) => {
                  realInfoMap.set(key, value);
                });
              });

              const realPlayersMap = realTeamDoc.getMap("players");
              realTeamDoc.transact(() => {
                playersMap.forEach((value, key) => {
                  realPlayersMap.set(key, value);
                });
              });

              const matchesMap = tempDoc.getMap("matches");
              if (matchesMap.size > 0) {
                const realMatchesMap = realTeamDoc.getMap("matches");
                realTeamDoc.transact(() => {
                  matchesMap.forEach((value, key) => {
                    realMatchesMap.set(key, value);
                  });
                });
              }

              console.log(
                "[TeamSync] Data copied to real team doc, ID:",
                receivedTeamId,
              );

              // Step 2: Add team ref if not exists
              const existingRefs = getTeamRefs();
              const alreadyExists = existingRefs.some(
                (ref) => ref.id === receivedTeamId,
              );

              if (!alreadyExists) {
                const teamRef: TeamRef = {
                  id: receivedTeamId,
                  name: receivedTeamName,
                  sportProfileId:
                    (infoMap.get("sportProfileId") as string) ?? "handball",
                  createdAt: (infoMap.get("createdAt") as number) ?? Date.now(),
                };
                addTeamRef(teamRef);
                console.log("[TeamSync] Team ref added:", teamRef);
              }

              // Step 3: Disconnect from temp doc and reconnect with real doc
              // This is crucial for continuous sync!
              console.log(
                "[TeamSync] Switching to real team doc for continuous sync...",
              );
              p2pSync.disconnect();

              // Small delay to ensure clean disconnect
              await new Promise((r) => setTimeout(r, 100));

              // Rejoin with the REAL team doc - now both devices sync the same doc
              await p2pSync.joinRoom(roomCode, realTeamDoc);
              console.log(
                "[TeamSync] Reconnected with real team doc, continuous sync active!",
              );

              // Update the syncing team ref to the real ID
              syncingTeamIdRef.current = receivedTeamId;

              // Set as active team
              setActiveTeamId(receivedTeamId);
              console.log("[TeamSync] Active team set to:", receivedTeamId);

              setState((prev) => ({ ...prev, teamImported: true }));
              resolve(receivedTeamId);
            } else if (attempts >= maxAttempts) {
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
