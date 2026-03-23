import { create } from "zustand";
import type { Match, MatchPlayer, MatchEvent } from "@/data/schemas";
import type { SubstitutionPlan } from "@/engine/substitution/types";
import {
  getCurrentMatch,
  saveCurrentMatch,
  clearCurrentMatch,
  saveMatch,
} from "@/data/yjs";
import { recalculateSchedule } from "@/engine/substitution/recalculate";
import { getTotalMatchSeconds } from "@/engine/timer/matchTimer";
import { getSportProfile } from "@/engine/sport-profiles";
import { getDeviceId } from "@/lib/utils";
import {
  vibrateSuccess,
  vibrateWarning,
  vibrateNotification,
} from "@/lib/haptics";

/**
 * Represents a pending replacement request.
 * When a player is injured, sent off with penalty, etc., and the sport rules allow
 * immediate replacement, this state tracks that a replacement needs to be chosen.
 */
interface PendingReplacement {
  type: "injury" | "penaltyEnd" | "redCardPenaltyEnd";
  /** The player who left the field (for injury) or whose penalty ended */
  playerId: string;
  /** For penalty/redCard: the penaltyId that triggered this */
  penaltyId?: string;
}

interface MatchState {
  // Current team context (must be set before using match operations)
  teamId: string | undefined;
  match: Match | undefined;
  selectedPlayerIds: string[];
  substitutionPlan: SubstitutionPlan;
  lastAction: { event: MatchEvent; index: number } | undefined;
  showUndo: boolean;
  /** When set, UI should prompt user to select a bench player to enter the field */
  pendingReplacement: PendingReplacement | undefined;

  /**
   * Whether this device is the match host (controller).
   * Only the host can control the match (timer, subs, goals, etc.)
   * Other devices are viewers only - they see the match state but cannot modify it.
   */
  isHost: boolean;

  setTeamId: (teamId: string | undefined) => void;
  loadMatch: () => void;
  createMatch: (params: {
    teamId: string;
    opponentName: string;
    roster: MatchPlayer[];
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
    sportProfileId?: string;
    usePositionAwareSubstitutions?: boolean;
    substitutionMode?: "equal" | "fixed";
    fixedSubstitutionIntervalMinutes?: number;
  }) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  updateElapsed: (seconds: number) => void;
  startNextPeriod: () => void;
  togglePlayerSelection: (playerId: string) => void;
  clearSelection: () => void;
  executeSubstitution: (playerInId: string, playerOutId: string) => void;
  registerGoal: (playerId: string) => void;
  removeGoal: (playerId: string) => void;
  registerOpponentGoal: () => void;
  removeOpponentGoal: () => void;
  registerPenalty: (
    playerId: string,
    durationSeconds: number,
    teamPlaysShort?: boolean,
  ) => void;
  endPenalty: (penaltyId: string) => void;
  registerYellowCard: (
    playerId: string,
    secondYellowIsRed: boolean,
    penaltyDurationSeconds?: number,
  ) => void;
  registerRedCard: (playerId: string, penaltyDurationSeconds?: number) => void;
  registerInjury: (playerId: string) => void;
  recoverFromInjury: (playerId: string) => void;
  /** Complete a pending replacement by bringing a bench player onto the field */
  completePendingReplacement: (playerInId: string) => void;
  /** Cancel/dismiss a pending replacement (team plays short) */
  cancelPendingReplacement: () => void;
  undoLastAction: () => void;
  dismissUndo: () => void;
  endMatch: () => void;
  autoSave: () => void;
  adjustScore: (side: "home" | "away", score: number) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  teamId: undefined,
  match: undefined,
  selectedPlayerIds: [],
  substitutionPlan: { suggestions: [], warnings: [] },
  lastAction: undefined,
  showUndo: false,
  pendingReplacement: undefined,
  isHost: false,

  setTeamId: (teamId) => {
    set({ teamId });
    if (teamId) {
      const match = getCurrentMatch(teamId);
      // Check if this device is the match host
      const isHost = match?.hostDeviceId === getDeviceId();
      set({ match, isHost });
      if (match && match.status !== "finished") {
        const plan = recalcSchedule(match);
        set({ substitutionPlan: plan });
      }
    } else {
      set({ match: undefined, isHost: false });
    }
  },

  loadMatch: () => {
    const { teamId } = get();
    if (!teamId) return;
    const match = getCurrentMatch(teamId);
    // Check if this device is the match host
    const isHost = match?.hostDeviceId === getDeviceId();
    set({ match, isHost });
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
      sportProfileId: params.sportProfileId,
      usePositionAwareSubstitutions: params.usePositionAwareSubstitutions,
      substitutionMode: params.substitutionMode,
      fixedSubstitutionIntervalMinutes: params.fixedSubstitutionIntervalMinutes,
      lastSubstitutionTimeSeconds: 0,
      hostDeviceId: getDeviceId(), // Mark this device as the match host
      createdAt: now,
    };
    saveCurrentMatch(params.teamId, match);
    const plan = recalcSchedule(match);
    // This device created the match, so it's the host
    set({ teamId: params.teamId, match, substitutionPlan: plan, isHost: true });
  },

  startTimer: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
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
    saveCurrentMatch(teamId, updated);
    set({ match: updated });
  },

  pauseTimer: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const updated: Match = { ...match, status: "paused" };
    saveCurrentMatch(teamId, updated);
    set({ match: updated });
  },

  updateElapsed: (seconds) => {
    const { match, isHost } = get();
    if (!match || match.status !== "playing" || !isHost) return;

    const updatedMatch = { ...match, elapsedSeconds: seconds };

    // Recalculate substitution plan every 5 seconds to catch fixed interval suggestions
    const shouldRecalc =
      Math.floor(seconds / 5) !== Math.floor(match.elapsedSeconds / 5);

    if (shouldRecalc) {
      const plan = recalcSchedule(updatedMatch);
      set({ match: updatedMatch, substitutionPlan: plan });
    } else {
      set({ match: updatedMatch });
    }
  },

  startNextPeriod: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
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
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);
    set({ match: updated, substitutionPlan: plan });
  },

  togglePlayerSelection: (playerId: string) => {
    const { selectedPlayerIds, isHost } = get();
    if (!isHost) return;
    if (selectedPlayerIds.includes(playerId)) {
      // Deselect
      set({
        selectedPlayerIds: selectedPlayerIds.filter((id) => id !== playerId),
      });
    } else {
      // Select
      set({ selectedPlayerIds: [...selectedPlayerIds, playerId] });
    }
  },

  clearSelection: () => {
    set({ selectedPlayerIds: [] });
  },

  executeSubstitution: (playerInId, playerOutId) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const event: MatchEvent = {
      type: "substitution",
      timestamp: match.elapsedSeconds,
      playerInId,
      playerOutId,
    };
    // Check if the outgoing player is the keeper - transfer the flag to incoming player
    const outgoingPlayer = match.roster.find((p) => p.playerId === playerOutId);
    const transferKeeper = outgoingPlayer?.isKeeper ?? false;

    const roster = match.roster.map((p) => {
      if (p.playerId === playerOutId) {
        const periods = p.periods.map((per, i) =>
          i === p.periods.length - 1 && !per.outAt
            ? { ...per, outAt: match.elapsedSeconds }
            : per,
        );
        // Remove keeper flag when substituted out
        return { ...p, status: "bench" as const, periods, isKeeper: false };
      }
      if (p.playerId === playerInId) {
        return {
          ...p,
          status: "field" as const,
          periods: [...p.periods, { inAt: match.elapsedSeconds }],
          // Transfer keeper flag if the outgoing player was keeper
          isKeeper: transferKeeper ? true : p.isKeeper,
        };
      }
      return p;
    });
    // Calculate current match time for tracking last substitution
    const currentMatchTime =
      (match.currentPeriod - 1) * match.periodDurationMinutes * 60 +
      match.elapsedSeconds;

    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
      lastSubstitutionTimeSeconds: currentMatchTime,
    };
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);
    // Remove the substituted player from selection
    const { selectedPlayerIds } = get();
    const newSelection = selectedPlayerIds.filter(
      (id) => id !== playerInId && id !== playerOutId,
    );

    // Haptic feedback for substitution
    vibrateSuccess();

    set({
      match: updated,
      selectedPlayerIds: newSelection,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerGoal: (playerId) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
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
    saveCurrentMatch(teamId, updated);

    // Haptic feedback for goal
    vibrateSuccess();

    set({
      match: updated,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  removeGoal: (playerId) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;

    // Find the player and check they have goals to remove
    const player = match.roster.find((p) => p.playerId === playerId);
    if (!player || player.goals <= 0) return;

    const roster = match.roster.map((p) =>
      p.playerId === playerId ? { ...p, goals: Math.max(0, p.goals - 1) } : p,
    );
    const updated: Match = {
      ...match,
      homeScore: Math.max(0, match.homeScore - 1),
      roster,
      // Note: We don't remove the goal event from history, just adjust the count
      // This keeps the timeline accurate while allowing score corrections
    };
    saveCurrentMatch(teamId, updated);
    set({ match: updated });
  },

  registerOpponentGoal: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const event: MatchEvent = {
      type: "opponentGoal",
      timestamp: match.elapsedSeconds,
    };
    const updated: Match = {
      ...match,
      awayScore: match.awayScore + 1,
      events: [...match.events, event],
    };
    saveCurrentMatch(teamId, updated);

    // Haptic feedback for opponent goal (notification style)
    vibrateNotification();

    set({
      match: updated,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  removeOpponentGoal: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost || match.awayScore <= 0) return;

    const updated: Match = {
      ...match,
      awayScore: Math.max(0, match.awayScore - 1),
    };
    saveCurrentMatch(teamId, updated);
    set({ match: updated });
  },

  registerPenalty: (playerId, durationSeconds, teamPlaysShort = true) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const penaltyId = crypto.randomUUID();
    const event: MatchEvent = {
      type: "penalty",
      timestamp: match.elapsedSeconds,
      playerId,
      durationSeconds,
      penaltyId,
      teamPlaysShort,
    };

    // If teamPlaysShort is false (e.g., misconduct), player sits out but team can substitute
    // We still mark player as penalty status, but we'll trigger a replacement prompt
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
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);

    // Haptic feedback for penalty (warning style)
    vibrateWarning();

    // If team doesn't play short, prompt for a replacement player
    const pendingReplacement: PendingReplacement | undefined = !teamPlaysShort
      ? { type: "penaltyEnd", playerId, penaltyId }
      : undefined;

    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
      pendingReplacement,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  endPenalty: (penaltyId) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;

    // Find the player and check if they have a red card
    const penaltyEvent = match.events.find(
      (e) => e.type === "penalty" && e.penaltyId === penaltyId,
    );
    const playerId =
      penaltyEvent && "playerId" in penaltyEvent
        ? penaltyEvent.playerId
        : undefined;

    const player = match.roster.find((p) => p.playerId === playerId);
    const isRedCardPenalty = player?.status === "redCard";

    // Check sport rules for red card handling
    const sportProfile = getSportProfile(match.sportProfileId ?? "handball");
    const redCardPermanent = sportProfile?.penalties.redCardPermanent ?? false;

    const event: MatchEvent = {
      type: "penaltyEnd",
      timestamp: match.elapsedSeconds,
      penaltyId,
    };

    // For regular penalty: player goes to bench
    // For red card penalty: player stays out, but team can bring someone else in
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId && p.status === "penalty") {
        return { ...p, status: "bench" as const };
      }
      // Red card player stays at redCard status
      return p;
    });

    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);

    // If this was a red card penalty and the sport allows replacement after penalty ends,
    // prompt for a replacement player
    const pendingReplacement: PendingReplacement | undefined =
      isRedCardPenalty && !redCardPermanent
        ? { type: "redCardPenaltyEnd", playerId: playerId!, penaltyId }
        : // For regular penalty, also offer to bring someone in (penalty player went to bench)
          player?.status === "penalty"
          ? { type: "penaltyEnd", playerId: playerId!, penaltyId }
          : undefined;

    set({ match: updated, substitutionPlan: plan, pendingReplacement });
  },

  registerYellowCard: (
    playerId,
    secondYellowIsRed,
    penaltyDurationSeconds = 120,
  ) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;

    const player = match.roster.find((p) => p.playerId === playerId);
    if (!player) return;

    const currentYellowCards = player.yellowCards ?? 0;
    const newYellowCards = currentYellowCards + 1;

    // Check if this is a second yellow (becomes red)
    if (secondYellowIsRed && newYellowCards >= 2) {
      // This triggers a red card
      const yellowEvent: MatchEvent = {
        type: "yellowCard",
        timestamp: match.elapsedSeconds,
        playerId,
      };
      const redEvent: MatchEvent = {
        type: "redCard",
        timestamp: match.elapsedSeconds,
        playerId,
        wasSecondYellow: true,
      };
      // Start penalty for numerical disadvantage
      const penaltyId = crypto.randomUUID();
      const penaltyEvent: MatchEvent = {
        type: "penalty",
        timestamp: match.elapsedSeconds,
        playerId,
        durationSeconds: penaltyDurationSeconds,
        penaltyId,
      };
      const roster = match.roster.map((p) => {
        if (p.playerId === playerId) {
          const periods = p.periods.map((per, i) =>
            i === p.periods.length - 1 && !per.outAt
              ? { ...per, outAt: match.elapsedSeconds }
              : per,
          );
          return {
            ...p,
            status: "redCard" as const,
            periods,
            yellowCards: newYellowCards,
          };
        }
        return p;
      });
      const updated: Match = {
        ...match,
        roster,
        events: [...match.events, yellowEvent, redEvent, penaltyEvent],
      };
      saveCurrentMatch(teamId, updated);
      const plan = recalcSchedule(updated);
      set({
        match: updated,
        substitutionPlan: plan,
        lastAction: { event: yellowEvent, index: updated.events.length - 3 },
        showUndo: true,
      });
    } else {
      // Just a yellow card, no red
      const event: MatchEvent = {
        type: "yellowCard",
        timestamp: match.elapsedSeconds,
        playerId,
      };
      const roster = match.roster.map((p) => {
        if (p.playerId === playerId) {
          return { ...p, yellowCards: newYellowCards };
        }
        return p;
      });
      const updated: Match = {
        ...match,
        roster,
        events: [...match.events, event],
      };
      saveCurrentMatch(teamId, updated);
      const plan = recalcSchedule(updated);

      // Haptic feedback for yellow card
      vibrateWarning();

      set({
        match: updated,
        substitutionPlan: plan,
        lastAction: { event, index: updated.events.length - 1 },
        showUndo: true,
      });
    }
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  registerRedCard: (playerId, penaltyDurationSeconds = 120) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const event: MatchEvent = {
      type: "redCard",
      timestamp: match.elapsedSeconds,
      playerId,
    };
    // Also start a penalty for numerical disadvantage (duration from sport profile)
    const penaltyId = crypto.randomUUID();
    const penaltyEvent: MatchEvent = {
      type: "penalty",
      timestamp: match.elapsedSeconds,
      playerId,
      durationSeconds: penaltyDurationSeconds,
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
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);

    // Haptic feedback for red card (strong warning)
    vibrateWarning();

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
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;

    // Check if sport allows immediate replacement for injuries
    const sportProfile = getSportProfile(match.sportProfileId ?? "handball");
    const allowsReplacement =
      sportProfile?.substitutions.injuryAllowsReplacement ?? true;

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
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);

    // Haptic feedback for injury (warning style)
    vibrateWarning();

    // If sport allows replacement, set pending replacement so UI prompts for substitute
    const pendingReplacement: PendingReplacement | undefined = allowsReplacement
      ? { type: "injury", playerId }
      : undefined;

    set({
      match: updated,
      substitutionPlan: plan,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
      pendingReplacement,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  recoverFromInjury: (playerId) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const event: MatchEvent = {
      type: "injuryRecovery",
      timestamp: match.elapsedSeconds,
      playerId,
    };
    const roster = match.roster.map((p) => {
      if (p.playerId === playerId && p.status === "injured") {
        return { ...p, status: "bench" as const };
      }
      return p;
    });
    const updated: Match = {
      ...match,
      roster,
      events: [...match.events, event],
    };
    saveCurrentMatch(teamId, updated);
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

  completePendingReplacement: (playerInId) => {
    const { teamId, match, pendingReplacement, isHost } = get();
    if (!teamId || !match || !pendingReplacement || !isHost) return;

    // Bring the selected bench player onto the field
    const event: MatchEvent = {
      type: "substitution",
      timestamp: match.elapsedSeconds,
      playerInId,
      // For injury/penalty replacement, there's no player "out" - just someone coming in
      // We use a special marker to indicate this is a replacement, not a swap
      playerOutId: pendingReplacement.playerId,
    };

    const roster = match.roster.map((p) => {
      if (p.playerId === playerInId && p.status === "bench") {
        // Bring player onto field
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
    saveCurrentMatch(teamId, updated);
    const plan = recalcSchedule(updated);
    set({
      match: updated,
      substitutionPlan: plan,
      pendingReplacement: undefined,
      lastAction: { event, index: updated.events.length - 1 },
      showUndo: true,
    });
    setTimeout(() => {
      if (get().showUndo) set({ showUndo: false });
    }, 5000);
  },

  cancelPendingReplacement: () => {
    // Dismiss the replacement prompt - team continues playing short
    const { isHost } = get();
    if (!isHost) return;
    set({ pendingReplacement: undefined });
  },

  undoLastAction: () => {
    const { teamId, match, lastAction, isHost } = get();
    if (!teamId || !match || !lastAction || !isHost) return;
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
    } else if (event.type === "yellowCard") {
      // Decrement yellow card count
      updated.roster = updated.roster.map((p) => {
        if (p.playerId === event.playerId) {
          return { ...p, yellowCards: Math.max(0, (p.yellowCards ?? 1) - 1) };
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

    saveCurrentMatch(teamId, updated);
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
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
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

    // Save to match history
    saveMatch(teamId, updated.id, updated);
    // Clear current match
    clearCurrentMatch(teamId);
    set({ match: updated, showUndo: false, lastAction: undefined });
  },

  autoSave: () => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || match.status === "finished" || !isHost) return;
    // Update play times before saving
    const roster = match.roster.map((p) => {
      const totalPlayTimeSeconds = p.periods.reduce((sum, per) => {
        const outAt = per.outAt ?? match.elapsedSeconds;
        return sum + (outAt - per.inAt);
      }, 0);
      return { ...p, totalPlayTimeSeconds };
    });
    const updated = { ...match, roster };
    saveCurrentMatch(teamId, updated);
  },

  adjustScore: (side, score) => {
    const { teamId, match, isHost } = get();
    if (!teamId || !match || !isHost) return;
    const updated = {
      ...match,
      [side === "home" ? "homeScore" : "awayScore"]: Math.max(0, score),
    };
    saveCurrentMatch(teamId, updated);
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

  // Build position group map from sport profile (if position-aware is enabled)
  let positionGroupMap: Record<string, string> = {};
  if (match.usePositionAwareSubstitutions && match.sportProfileId) {
    const sportProfile = getSportProfile(match.sportProfileId);
    if (sportProfile?.players.positions) {
      positionGroupMap = sportProfile.players.positions.reduce(
        (map, pos) => {
          if (pos.groupId) {
            map[pos.id] = pos.groupId;
          }
          return map;
        },
        {} as Record<string, string>,
      );
    }
  }

  // Calculate fixed interval in seconds if mode is "fixed"
  const fixedIntervalSeconds =
    match.substitutionMode === "fixed" &&
    match.fixedSubstitutionIntervalMinutes !== undefined
      ? match.fixedSubstitutionIntervalMinutes * 60
      : undefined;

  return recalculateSchedule({
    roster: match.roster,
    totalMatchSeconds: totalSeconds,
    currentTimeSeconds: currentSeconds,
    playersOnField: match.playersOnField,
    hasKeeper: true,
    keeperPlayerId: match.keeperPlayerId,
    usePositionAwareSubstitutions: match.usePositionAwareSubstitutions,
    positionGroupMap,
    substitutionMode: match.substitutionMode,
    fixedIntervalSeconds,
    lastSubstitutionTimeSeconds: match.lastSubstitutionTimeSeconds ?? 0,
  });
}
