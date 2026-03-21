import { create } from "zustand";
import type { Match, MatchPlayer, MatchEvent } from "@/data/schemas";
import type { SubstitutionPlan } from "@/engine/substitution/types";
import {
  getCurrentMatchFromYjs,
  saveCurrentMatchToYjs,
  clearCurrentMatch,
  saveMatchToHistory,
} from "@/data/yjs/matchDoc";
import { recalculateSchedule } from "@/engine/substitution/recalculate";
import { getTotalMatchSeconds } from "@/engine/timer/matchTimer";

interface MatchState {
  match: Match | undefined;
  selectedPlayerId: string | undefined;
  substitutionPlan: SubstitutionPlan;
  lastAction: { event: MatchEvent; index: number } | undefined;
  showUndo: boolean;

  loadMatch: () => void;
  createMatch: (params: {
    teamId: string;
    opponentName: string;
    roster: MatchPlayer[];
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
  }) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  updateElapsed: (seconds: number) => void;
  startNextPeriod: () => void;
  selectPlayer: (playerId: string | undefined) => void;
  executeSubstitution: (playerInId: string, playerOutId: string) => void;
  registerGoal: (playerId: string) => void;
  registerOpponentGoal: () => void;
  registerPenalty: (playerId: string, durationSeconds: number) => void;
  endPenalty: (penaltyId: string) => void;
  registerRedCard: (playerId: string) => void;
  registerInjury: (playerId: string) => void;
  undoLastAction: () => void;
  dismissUndo: () => void;
  endMatch: () => void;
  autoSave: () => void;
  adjustScore: (side: "home" | "away", score: number) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  match: undefined,
  selectedPlayerId: undefined,
  substitutionPlan: { suggestions: [], warnings: [] },
  lastAction: undefined,
  showUndo: false,

  loadMatch: () => {
    const match = getCurrentMatchFromYjs();
    set({ match });
    if (match && match.status !== "finished") {
      const plan = recalcSchedule(match);
      set({ substitutionPlan: plan });
    }
  },

  createMatch: (params) => {
    const now = Date.now();
    const match: Match = {
      id: crypto.randomUUID(),
      teamId: params.teamId,
      opponentName: params.opponentName,
      date: now,
      status: "setup",
      periodDurationMinutes: params.periodDurationMinutes,
      periodCount: params.periodCount,
      playersOnField: params.playersOnField,
      currentPeriod: 1,
      elapsedSeconds: 0,
      homeScore: 0,
      awayScore: 0,
      roster: params.roster,
      events: [],
      createdAt: now,
    };
    saveCurrentMatchToYjs(match);
    const plan = recalcSchedule(match);
    set({ match, substitutionPlan: plan });
  },

  startTimer: () => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "periodStart",
      timestamp: match.elapsedSeconds,
      period: match.currentPeriod,
    };
    const updated: Match = {
      ...match,
      status: "playing",
      events: [...match.events, event],
    };
    // Mark field players as having a new period
    updated.roster = updated.roster.map((p) => {
      if (p.status === "field") {
        return {
          ...p,
          periods: [...p.periods, { inAt: match.elapsedSeconds }],
        };
      }
      return p;
    });
    saveCurrentMatchToYjs(updated);
    set({ match: updated });
  },

  pauseTimer: () => {
    const { match } = get();
    if (!match) return;
    const updated: Match = { ...match, status: "paused" };
    saveCurrentMatchToYjs(updated);
    set({ match: updated });
  },

  updateElapsed: (seconds) => {
    const { match } = get();
    if (!match || match.status !== "playing") return;
    set({
      match: { ...match, elapsedSeconds: seconds },
    });
  },

  startNextPeriod: () => {
    const { match } = get();
    if (!match) return;
    const updated: Match = {
      ...match,
      status: "playing",
      currentPeriod: match.currentPeriod + 1,
      elapsedSeconds: 0,
      events: [
        ...match.events,
        {
          type: "periodStart",
          timestamp: 0,
          period: match.currentPeriod + 1,
        },
      ],
    };
    updated.roster = updated.roster.map((p) => {
      if (p.status === "field") {
        return { ...p, periods: [...p.periods, { inAt: 0 }] };
      }
      return p;
    });
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({ match: updated, substitutionPlan: plan });
  },

  selectPlayer: (playerId) => {
    set({ selectedPlayerId: playerId });
  },

  executeSubstitution: (playerInId, playerOutId) => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "substitution",
      timestamp: match.elapsedSeconds,
      playerInId,
      playerOutId,
    };
    const roster = match.roster.map((p) => {
      if (p.playerId === playerOutId) {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        return { ...p, status: "bench" as const, periods };
      }
      if (p.playerId === playerInId) {
        return {
          ...p,
          status: "field" as const,
          periods: [...p.periods, { inAt: match.elapsedSeconds }],
        };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      selectedPlayerId: undefined,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerGoal: (playerId) => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "goal",
      timestamp: match.elapsedSeconds,
      playerId,
    };
    const roster = match.roster.map((p) =>
      p.playerId === playerId ? { ...p, goals: p.goals + 1 } : p,
    );
    const updated: Match = {
      ...match,
      homeScore: match.homeScore + 1,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    set({
      match: updated,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerOpponentGoal: () => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "opponentGoal",
      timestamp: match.elapsedSeconds,
    };
    const updated: Match = {
      ...match,
      awayScore: match.awayScore + 1,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    set({
      match: updated,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerPenalty: (playerId, durationSeconds) => {
    const { match } = get();
    if (!match) return;
    const penaltyId = crypto.randomUUID();
    const event: MatchEvent = {
      type: "penalty",
      timestamp: match.elapsedSeconds,
      playerId,
      durationSeconds,
      penaltyId,
    };
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId) {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        return { ...p, status: "penalty" as const, periods };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  endPenalty: (penaltyId) => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "penaltyEnd",
      timestamp: match.elapsedSeconds,
      penaltyId,
    };
    // Find the player associated with this penalty
    const penaltyEvent = match.events.find(
      (e) => e.type === "penalty" && e.penaltyId === penaltyId,
    );
    const playerId =
      penaltyEvent && "playerId" in penaltyEvent
        ? penaltyEvent.playerId
        : undefined;
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId && p.status === "penalty") {
        return { ...p, status: "bench" as const };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({ match: updated, substitutionPlan: plan });
  },

  registerRedCard: (playerId) => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "redCard",
      timestamp: match.elapsedSeconds,
      playerId,
    };
    // Also start a 2-min penalty for numerical disadvantage
    const penaltyId = crypto.randomUUID();
    const penaltyEvent: MatchEvent = {
      type: "penalty",
      timestamp: match.elapsedSeconds,
      playerId,
      durationSeconds: 120,
      penaltyId,
    };
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId) {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        return { ...p, status: "redCard" as const, periods };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event, penaltyEvent],
    };
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 2 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerInjury: (playerId) => {
    const { match } = get();
    if (!match) return;
    const event: MatchEvent = {
      type: "injury",
      timestamp: match.elapsedSeconds,
      playerId,
    };
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId) {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        return { ...p, status: "injured" as const, periods };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  undoLastAction: () => {
    const { match, lastAction } = get();
    if (!match || !lastAction) return;
    const event = lastAction.event;
    const updated = { ...match };

    if (event.type === "substitution") {
      // Reverse the swap
      updated.roster = updated.roster.map((p) => {
        if (p.playerId === event.playerOutId) {
          const periods = [...p.periods];
          if (periods.length > 0) {
            const last = periods[periods.length - 1];
            if (last && last.outAt !== undefined) {
              periods[periods.length - 1] = { inAt: last.inAt };
            }
          }
          return { ...p, status: "field" as const, periods };
        }
        if (p.playerId === event.playerInId) {
          const periods = p.periods.slice(0, -1);
          return { ...p, status: "bench" as const, periods };
        }
        return p;
      });
    } else if (event.type === "goal") {
      updated.homeScore = Math.max(0, updated.homeScore - 1);
      updated.roster = updated.roster.map((p) =>
        p.playerId === event.playerId
          ? { ...p, goals: Math.max(0, p.goals - 1) }
          : p,
      );
    } else if (event.type === "opponentGoal") {
      updated.awayScore = Math.max(0, updated.awayScore - 1);
    } else if (event.type === "penalty") {
      updated.roster = updated.roster.map((p) => {
        if (p.playerId === event.playerId && p.status === "penalty") {
          const periods = [...p.periods];
          if (periods.length > 0) {
            const last = periods[periods.length - 1];
            if (last && last.outAt !== undefined) {
              periods[periods.length - 1] = { inAt: last.inAt };
            }
          }
          return { ...p, status: "field" as const, periods };
        }
        return p;
      });
    } else if (event.type === "redCard") {
      updated.roster = updated.roster.map((p) => {
        if (p.playerId === event.playerId && p.status === "redCard") {
          const periods = [...p.periods];
          if (periods.length > 0) {
            const last = periods[periods.length - 1];
            if (last && last.outAt !== undefined) {
              periods[periods.length - 1] = { inAt: last.inAt };
            }
          }
          return { ...p, status: "field" as const, periods };
        }
        return p;
      });
      // Also remove the associated penalty event
      updated.events = updated.events.filter(
        (_, i) => i < lastAction.index || i > lastAction.index + 1,
      );
    } else if (event.type === "injury") {
      updated.roster = updated.roster.map((p) => {
        if (p.playerId === event.playerId && p.status === "injured") {
          const periods = [...p.periods];
          if (periods.length > 0) {
            const last = periods[periods.length - 1];
            if (last && last.outAt !== undefined) {
              periods[periods.length - 1] = { inAt: last.inAt };
            }
          }
          return { ...p, status: "field" as const, periods };
        }
        return p;
      });
    }

    // Remove the undone event (unless already removed for redCard)
    if (event.type !== "redCard") {
      updated.events = updated.events.filter((_, i) => i !== lastAction.index);
    }

    // Add undo event
    const undoEvent: MatchEvent = {
      type: "undo",
      timestamp: match.elapsedSeconds,
      undoneEventIndex: lastAction.index,
    };
    updated.events = [...updated.events, undoEvent];

    saveCurrentMatchToYjs(updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: undefined,
      showUndo: false,
    });
  },

  dismissUndo: () => {
    set({ showUndo: false });
  },

  endMatch: () => {
    const { match } = get();
    if (!match) return;
    // Close all open play periods
    const roster = match.roster.map((p) => {
      if (p.status === "field") {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        // Calculate total play time
        const totalPlayTimeSeconds = periods.reduce((sum, per) => {
          const outAt = per.outAt ?? match.elapsedSeconds;
          return sum + (outAt - per.inAt);
        }, 0);
        return {
          ...p,
          status: "bench" as const,
          periods,
          totalPlayTimeSeconds,
        };
      }
      // Recalculate total play time for all players
      const totalPlayTimeSeconds = p.periods.reduce((sum, per) => {
        const outAt = per.outAt ?? match.elapsedSeconds;
        return sum + (outAt - per.inAt);
      }, 0);
      return { ...p, totalPlayTimeSeconds };
    });

    const updated: Match = {
      ...match,
      status: "finished",
      roster,
      finishedAt: Date.now(),
      events: [
        ...match.events,
        {
          type: "periodEnd",
          timestamp: match.elapsedSeconds,
          period: match.currentPeriod,
        },
      ],
    };

    saveMatchToHistory(updated);
    clearCurrentMatch();
    set({ match: updated, showUndo: false, lastAction: undefined });
  },

  autoSave: () => {
    const { match } = get();
    if (!match || match.status === "finished") return;
    // Update play times before saving
    const roster = match.roster.map((p) => {
      const totalPlayTimeSeconds = p.periods.reduce((sum, per) => {
        const outAt = per.outAt ?? match.elapsedSeconds;
        return sum + (outAt - per.inAt);
      }, 0);
      return { ...p, totalPlayTimeSeconds };
    });
    const updated = { ...match, roster };
    saveCurrentMatchToYjs(updated);
  },

  adjustScore: (side, score) => {
    const { match } = get();
    if (!match) return;
    const updated = {
      ...match,
      [side === "home" ? "homeScore" : "awayScore"]: Math.max(0, score),
    };
    saveCurrentMatchToYjs(updated);
    set({ match: updated });
  },
}));

function recalcSchedule(match: Match): SubstitutionPlan {
  const totalSeconds = getTotalMatchSeconds(
    match.periodDurationMinutes,
    match.periodCount,
  );
  const currentSeconds =
    (match.currentPeriod - 1) * match.periodDurationMinutes * 60 +
    match.elapsedSeconds;

  return recalculateSchedule({
    roster: match.roster,
    totalMatchSeconds: totalSeconds,
    currentTimeSeconds: currentSeconds,
    playersOnField: match.playersOnField,
    hasKeeper: true,
    keeperPlayerId: undefined, // MVP: no keeper tracking
  });
}
