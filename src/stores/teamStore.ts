import { create } from "zustand";
import type { Team, Player, TeamRef } from "@/data/schemas";
import {
  getTeamInfo,
  saveTeamInfo,
  getPlayers,
  addPlayer as addPlayerToYjs,
  updatePlayer as updatePlayerInYjs,
  removePlayer as removePlayerFromYjs,
  addTeamRef,
  updateTeamRef,
  removeTeamRef,
  getActiveTeamId,
  setActiveTeamId,
  clearActiveTeamId,
  destroyTeamDoc,
  waitForAppSync,
  waitForTeamSync,
} from "@/data/yjs";
import { getSportProfileOrThrow } from "@/engine/sport-profiles";

/**
 * Team store for managing multi-team state.
 * This store handles:
 * - Active team selection
 * - Creating/deleting teams
 * - Team CRUD operations (delegating to Yjs)
 * - Player CRUD operations (delegating to Yjs)
 *
 * Note: The actual data is stored in Yjs and persisted via y-indexeddb.
 * This store provides imperative actions and caches the current state.
 */

interface TeamState {
  // Currently active team ID
  activeTeamId: string | undefined;
  // Cached team info (updated when activeTeamId changes)
  team: Team | undefined;
  // Cached players (updated when activeTeamId changes)
  players: Player[];
  // Loading state
  loading: boolean;
  // Initialization (async - waits for Yjs sync)
  initialize: () => Promise<void>;
  // Team selection (async - waits for team doc sync)
  selectTeam: (teamId: string) => Promise<void>;
  // Team CRUD
  createTeam: (name: string, sportProfileId: string) => Team;
  updateTeam: (
    updates: Partial<
      Pick<Team, "name" | "clubName" | "sportProfileId" | "settings">
    >,
  ) => void;
  deleteTeam: (teamId: string) => void;
  // Player CRUD
  addPlayer: (name: string, number?: number) => void;
  updatePlayer: (
    playerId: string,
    updates: Partial<Pick<Player, "name" | "number" | "active">>,
  ) => void;
  removePlayer: (playerId: string) => void;
  reorderPlayers: (fromIndex: number, toIndex: number) => void;
  // Refresh from Yjs
  refreshTeam: () => void;
  refreshPlayers: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  activeTeamId: undefined,
  team: undefined,
  players: [],
  loading: true,

  initialize: async () => {
    // Wait for app doc to sync from IndexedDB
    await waitForAppSync();

    const activeId = getActiveTeamId();
    if (activeId) {
      // Wait for team doc to sync from IndexedDB
      await waitForTeamSync(activeId);
      const team = getTeamInfo(activeId);
      const players = getPlayers(activeId);
      set({ activeTeamId: activeId, team, players, loading: false });
    } else {
      set({ loading: false });
    }
  },

  selectTeam: async (teamId) => {
    setActiveTeamId(teamId);
    // Wait for team doc to sync from IndexedDB
    await waitForTeamSync(teamId);
    const team = getTeamInfo(teamId);
    const players = getPlayers(teamId);
    set({ activeTeamId: teamId, team, players });
  },

  createTeam: (name, sportProfileId) => {
    const profile = getSportProfileOrThrow(sportProfileId);
    const teamId = crypto.randomUUID();
    const now = Date.now();

    const team: Team = {
      id: teamId,
      name,
      sportProfileId,
      settings: {
        periodDurationMinutes: profile.match.defaultPeriodDurationMinutes,
        periodCount: profile.match.defaultPeriodCount,
        playersOnField: profile.players.defaultPlayersOnField,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save team info to its own Yjs doc
    saveTeamInfo(teamId, team);

    // Add reference to app doc
    const teamRef: TeamRef = {
      id: teamId,
      name,
      sportProfileId,
      createdAt: now,
    };
    addTeamRef(teamRef);

    // Select the new team
    setActiveTeamId(teamId);
    set({ activeTeamId: teamId, team, players: [] });

    return team;
  },

  updateTeam: (updates) => {
    const { activeTeamId, team } = get();
    if (!activeTeamId || !team) return;

    const updated: Team = {
      ...team,
      ...updates,
      updatedAt: Date.now(),
    };

    if (updates.settings) {
      updated.settings = { ...team.settings, ...updates.settings };
    }

    saveTeamInfo(activeTeamId, updated);

    // Update team ref if name or sport changed
    if (updates.name || updates.sportProfileId) {
      updateTeamRef(activeTeamId, {
        ...(updates.name && { name: updates.name }),
        ...(updates.sportProfileId && {
          sportProfileId: updates.sportProfileId,
        }),
      });
    }

    set({ team: updated });
  },

  deleteTeam: (teamId) => {
    const { activeTeamId } = get();

    // Remove from app doc
    removeTeamRef(teamId);

    // Destroy the team's Yjs doc and IndexedDB
    destroyTeamDoc(teamId);

    // If this was the active team, clear selection in both Zustand AND Yjs
    if (activeTeamId === teamId) {
      clearActiveTeamId(); // Clear from Yjs persistence
      set({ activeTeamId: undefined, team: undefined, players: [] });
    }
  },

  addPlayer: (name, number) => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      number,
      active: true,
    };

    addPlayerToYjs(activeTeamId, player);

    // Refresh players from Yjs
    const players = getPlayers(activeTeamId);
    set({ players });
  },

  updatePlayer: (playerId, updates) => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;

    updatePlayerInYjs(activeTeamId, playerId, updates);

    // Refresh players from Yjs
    const players = getPlayers(activeTeamId);
    set({ players });
  },

  removePlayer: (playerId) => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;

    removePlayerFromYjs(activeTeamId, playerId);

    // Refresh players from Yjs
    const players = getPlayers(activeTeamId);
    set({ players });
  },

  reorderPlayers: (fromIndex, toIndex) => {
    const { activeTeamId, players } = get();
    if (!activeTeamId) return;

    // Reordering is tricky with a Map-based Yjs structure
    // For now, we just update the local state
    // TODO: Implement proper ordering via a Y.Array or order field
    const newPlayers = [...players];
    const [moved] = newPlayers.splice(fromIndex, 1);
    if (moved) {
      newPlayers.splice(toIndex, 0, moved);
      set({ players: newPlayers });
    }
  },

  refreshTeam: () => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;
    const team = getTeamInfo(activeTeamId);
    set({ team });
  },

  refreshPlayers: () => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;
    const players = getPlayers(activeTeamId);
    set({ players });
  },
}));
