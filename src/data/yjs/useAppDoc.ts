import { useSyncExternalStore, useCallback, useMemo } from "react";
import type { TeamRef } from "@/data/schemas";
import { getAppDoc, waitForAppSync, isAppSynced } from "@/data/yjs/yjsProvider";
import {
  getTeamRefs,
  addTeamRef as addTeamRefToYjs,
  updateTeamRef as updateTeamRefInYjs,
  removeTeamRef as removeTeamRefFromYjs,
  getActiveTeamId,
  setActiveTeamId as setActiveTeamIdInYjs,
} from "@/data/yjs/appDoc";

/**
 * Hook to subscribe to team refs (list of all teams)
 */
export function useTeamRefs(): {
  teamRefs: TeamRef[];
  loading: boolean;
  addTeamRef: (ref: TeamRef) => void;
  updateTeamRef: (
    teamId: string,
    updates: Partial<Pick<TeamRef, "name" | "sportProfileId">>,
  ) => void;
  removeTeamRef: (teamId: string) => void;
} {
  const subscribe = useCallback((callback: () => void) => {
    const doc = getAppDoc();
    const arr = doc.getArray<TeamRef>("teamRefs");
    const handler = (): void => callback();
    arr.observeDeep(handler);
    return () => arr.unobserveDeep(handler);
  }, []);

  const getSnapshot = useCallback((): TeamRef[] => {
    return getTeamRefs();
  }, []);

  const teamRefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loading = useMemo(() => !isAppSynced(), []);

  const addTeamRef = useCallback((ref: TeamRef) => {
    addTeamRefToYjs(ref);
  }, []);

  const updateTeamRef = useCallback(
    (
      teamId: string,
      updates: Partial<Pick<TeamRef, "name" | "sportProfileId">>,
    ) => {
      updateTeamRefInYjs(teamId, updates);
    },
    [],
  );

  const removeTeamRef = useCallback((teamId: string) => {
    removeTeamRefFromYjs(teamId);
  }, []);

  return { teamRefs, loading, addTeamRef, updateTeamRef, removeTeamRef };
}

/**
 * Hook to subscribe to the active team ID
 */
export function useActiveTeamId(): {
  activeTeamId: string | undefined;
  setActiveTeamId: (teamId: string) => void;
} {
  const subscribe = useCallback((callback: () => void) => {
    const doc = getAppDoc();
    const meta = doc.getMap("meta");
    const handler = (): void => callback();
    meta.observe(handler);
    return () => meta.unobserve(handler);
  }, []);

  const getSnapshot = useCallback((): string | undefined => {
    return getActiveTeamId();
  }, []);

  const activeTeamId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const setActiveTeamId = useCallback((teamId: string) => {
    setActiveTeamIdInYjs(teamId);
  }, []);

  return { activeTeamId, setActiveTeamId };
}

/**
 * Utility to wait for app sync
 */
export { waitForAppSync };
