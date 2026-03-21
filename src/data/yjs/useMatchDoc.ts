import { useSyncExternalStore, useCallback, useRef } from "react";
import type { Match } from "@/data/schemas";
import { getTeamDoc, isTeamSynced } from "@/data/yjs/yjsProvider";
import {
  getCurrentMatch as getCurrentMatchFromYjs,
  saveCurrentMatch as saveCurrentMatchToYjs,
  clearCurrentMatch as clearCurrentMatchFromYjs,
  getMatches,
  saveMatch as saveMatchToYjs,
  deleteMatch as deleteMatchFromYjs,
} from "@/data/yjs/teamDoc";

/**
 * Hook to subscribe to the current (live) match for a team
 */
export function useCurrentMatch(teamId: string | undefined): {
  match: Match | undefined;
  loading: boolean;
  saveMatch: (match: Match) => void;
  clearMatch: () => void;
} {
  // Cache the snapshot to avoid creating new objects on every render
  const cacheRef = useRef<{ data: Match | undefined; json: string }>({
    data: undefined,
    json: "",
  });

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!teamId) return () => {};
      const doc = getTeamDoc(teamId);
      const current = doc.getMap("currentMatch");
      const handler = (): void => callback();
      current.observeDeep(handler);
      return () => current.unobserveDeep(handler);
    },
    [teamId],
  );

  const getSnapshot = useCallback((): Match | undefined => {
    if (!teamId) return undefined;
    const newData = getCurrentMatchFromYjs(teamId) as Match | undefined;
    const newJson = JSON.stringify(newData);
    if (newJson !== cacheRef.current.json) {
      cacheRef.current = { data: newData, json: newJson };
    }
    return cacheRef.current.data;
  }, [teamId]);

  const match = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loading = teamId ? !isTeamSynced(teamId) : false;

  const saveMatch = useCallback(
    (newMatch: Match) => {
      if (!teamId) return;
      saveCurrentMatchToYjs(teamId, newMatch);
    },
    [teamId],
  );

  const clearMatch = useCallback(() => {
    if (!teamId) return;
    clearCurrentMatchFromYjs(teamId);
  }, [teamId]);

  return { match, loading, saveMatch, clearMatch };
}

/**
 * Hook to subscribe to match history for a team
 */
export function useMatchHistory(teamId: string | undefined): {
  matches: Match[];
  loading: boolean;
  saveToHistory: (match: Match) => void;
  deleteFromHistory: (matchId: string) => void;
} {
  // Cache the snapshot to avoid creating new arrays on every render
  const cacheRef = useRef<{ data: Match[]; json: string }>({
    data: [],
    json: "[]",
  });

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!teamId) return () => {};
      const doc = getTeamDoc(teamId);
      const matchesMap = doc.getMap("matches");
      const handler = (): void => callback();
      matchesMap.observeDeep(handler);
      return () => matchesMap.unobserveDeep(handler);
    },
    [teamId],
  );

  const getSnapshot = useCallback((): Match[] => {
    if (!teamId) return cacheRef.current.data;
    const raw = getMatches(teamId);
    // Sort by date descending
    const newData = (raw as Match[]).sort(
      (a, b) => (b.date ?? 0) - (a.date ?? 0),
    );
    const newJson = JSON.stringify(newData);
    if (newJson !== cacheRef.current.json) {
      cacheRef.current = { data: newData, json: newJson };
    }
    return cacheRef.current.data;
  }, [teamId]);

  const matches = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loading = teamId ? !isTeamSynced(teamId) : false;

  const saveToHistory = useCallback(
    (match: Match) => {
      if (!teamId) return;
      saveMatchToYjs(teamId, match.id, match);
    },
    [teamId],
  );

  const deleteFromHistory = useCallback(
    (matchId: string) => {
      if (!teamId) return;
      deleteMatchFromYjs(teamId, matchId);
    },
    [teamId],
  );

  return { matches, loading, saveToHistory, deleteFromHistory };
}
