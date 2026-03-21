import { useSyncExternalStore, useCallback, useMemo } from "react";
import type { Player, Team } from "@/data/schemas";
import {
  getTeamDoc,
  waitForTeamSync,
  isTeamSynced,
} from "@/data/yjs/yjsProvider";
import {
  getTeamInfo,
  saveTeamInfo,
  getPlayers,
  addPlayer as addPlayerToYjs,
  updatePlayer as updatePlayerInYjs,
  removePlayer as removePlayerFromYjs,
} from "@/data/yjs/teamDoc";

/**
 * Hook to subscribe to a team's info from Yjs
 */
export function useTeamInfo(teamId: string | undefined): {
  team: Team | undefined;
  loading: boolean;
  save: (team: Team) => void;
} {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!teamId) return () => {};
      const doc = getTeamDoc(teamId);
      const info = doc.getMap("info");
      const handler = (): void => callback();
      info.observeDeep(handler);
      return () => info.unobserveDeep(handler);
    },
    [teamId],
  );

  const getSnapshot = useCallback((): Team | undefined => {
    if (!teamId) return undefined;
    return getTeamInfo(teamId);
  }, [teamId]);

  const team = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loading = useMemo(() => {
    if (!teamId) return false;
    return !isTeamSynced(teamId);
  }, [teamId]);

  const save = useCallback(
    (newTeam: Team) => {
      if (!teamId) return;
      saveTeamInfo(teamId, newTeam);
    },
    [teamId],
  );

  return { team, loading, save };
}

/**
 * Hook to subscribe to a team's players from Yjs
 */
export function useTeamPlayers(teamId: string | undefined): {
  players: Player[];
  loading: boolean;
  addPlayer: (player: Player) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removePlayer: (playerId: string) => void;
} {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!teamId) return () => {};
      const doc = getTeamDoc(teamId);
      const playersMap = doc.getMap("players");
      const handler = (): void => callback();
      playersMap.observeDeep(handler);
      return () => playersMap.unobserveDeep(handler);
    },
    [teamId],
  );

  const getSnapshot = useCallback((): Player[] => {
    if (!teamId) return [];
    return getPlayers(teamId);
  }, [teamId]);

  const players = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loading = useMemo(() => {
    if (!teamId) return false;
    return !isTeamSynced(teamId);
  }, [teamId]);

  const addPlayer = useCallback(
    (player: Player) => {
      if (!teamId) return;
      addPlayerToYjs(teamId, player);
    },
    [teamId],
  );

  const updatePlayer = useCallback(
    (playerId: string, updates: Partial<Player>) => {
      if (!teamId) return;
      updatePlayerInYjs(teamId, playerId, updates);
    },
    [teamId],
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      if (!teamId) return;
      removePlayerFromYjs(teamId, playerId);
    },
    [teamId],
  );

  return { players, loading, addPlayer, updatePlayer, removePlayer };
}

/**
 * Utility to wait for team sync
 */
export { waitForTeamSync };
