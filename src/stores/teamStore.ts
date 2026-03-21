import { create } from "zustand";
import type { Team, Player } from "@/data/schemas";
import { getTeamFromYjs, saveTeamToYjs } from "@/data/yjs/teamDoc";
import { getSportProfileOrThrow } from "@/engine/sport-profiles";

interface TeamState {
  team: Team | undefined;
  loading: boolean;
  loadTeam: () => void;
  createTeam: (name: string, sportProfileId: string) => Team;
  updateTeam: (
    updates: Partial<Pick<Team, "name" | "clubName" | "settings">>,
  ) => void;
  addPlayer: (name: string, number?: number) => void;
  updatePlayer: (
    playerId: string,
    updates: Partial<Pick<Player, "name" | "number" | "active">>,
  ) => void;
  removePlayer: (playerId: string) => void;
  reorderPlayers: (fromIndex: number, toIndex: number) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  team: undefined,
  loading: true,

  loadTeam: () => {
    const team = getTeamFromYjs();
    set({ team, loading: false });
  },

  createTeam: (name, sportProfileId) => {
    const profile = getSportProfileOrThrow(sportProfileId);
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      sportProfileId,
      settings: {
        periodDurationMinutes: profile.match.defaultPeriodDurationMinutes,
        periodCount: profile.match.defaultPeriodCount,
        playersOnField: profile.players.defaultPlayersOnField,
      },
      players: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveTeamToYjs(team);
    set({ team });
    return team;
  },

  updateTeam: (updates) => {
    const { team } = get();
    if (!team) return;
    const updated = { ...team, ...updates, updatedAt: Date.now() };
    if (updates.settings) {
      updated.settings = { ...team.settings, ...updates.settings };
    }
    saveTeamToYjs(updated);
    set({ team: updated });
  },

  addPlayer: (name, number) => {
    const { team } = get();
    if (!team) return;
    const player: Player = {
      id: crypto.randomUUID(),
      name,
      number,
      active: true,
    };
    const updated = {
      ...team,
      players: [...team.players, player],
      updatedAt: Date.now(),
    };
    saveTeamToYjs(updated);
    set({ team: updated });
  },

  updatePlayer: (playerId, updates) => {
    const { team } = get();
    if (!team) return;
    const updated = {
      ...team,
      players: team.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p,
      ),
      updatedAt: Date.now(),
    };
    saveTeamToYjs(updated);
    set({ team: updated });
  },

  removePlayer: (playerId) => {
    const { team } = get();
    if (!team) return;
    const updated = {
      ...team,
      players: team.players.filter((p) => p.id !== playerId),
      updatedAt: Date.now(),
    };
    saveTeamToYjs(updated);
    set({ team: updated });
  },

  reorderPlayers: (fromIndex, toIndex) => {
    const { team } = get();
    if (!team) return;
    const players = [...team.players];
    const [moved] = players.splice(fromIndex, 1);
    if (!moved) return;
    players.splice(toIndex, 0, moved);
    const updated = { ...team, players, updatedAt: Date.now() };
    saveTeamToYjs(updated);
    set({ team: updated });
  },
}));
