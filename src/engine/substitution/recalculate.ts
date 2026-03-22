import type { MatchPlayer } from "@/data/schemas/match";
import type { SubstitutionPlan, ScheduleInput } from "./types";
import { calculateSchedule } from "./calculateSchedule";

export type RecalculateInput = {
  roster: MatchPlayer[];
  totalMatchSeconds: number;
  currentTimeSeconds: number;
  playersOnField: number;
  hasKeeper: boolean;
  keeperPlayerId?: string;
  usePositionAwareSubstitutions?: boolean;
  /** Map from positionId to groupId (for position-aware substitutions) */
  positionGroupMap?: Record<string, string>;
};

/**
 * Calculate LIVE play time for a player.
 * This includes time from completed periods PLUS current active session.
 */
function getLivePlayTime(
  player: MatchPlayer,
  currentTimeSeconds: number,
): number {
  return player.periods.reduce((sum, period) => {
    // If outAt is undefined, player is still on field - use current time
    const outAt = period.outAt ?? currentTimeSeconds;
    return sum + Math.max(0, outAt - period.inAt);
  }, 0);
}

/**
 * Recalculate substitution schedule based on current match state.
 * Called after any disruption: penalty, injury, red card, manual sub, period change.
 *
 * IMPORTANT: Uses LIVE play time (including current session) for accurate fairness.
 *
 * Pure function: same input always produces same output.
 */
export function recalculateSchedule(input: RecalculateInput): SubstitutionPlan {
  const {
    roster,
    totalMatchSeconds,
    currentTimeSeconds,
    playersOnField,
    hasKeeper,
    keeperPlayerId,
    usePositionAwareSubstitutions = false,
    positionGroupMap = {},
  } = input;

  // Filter out unavailable players (injured, red card)
  const availablePlayers = roster.filter(
    (p) => p.status !== "injured" && p.status !== "redCard",
  );

  // Build schedule input from current state
  // CRITICAL: Use live play time, not totalPlayTimeSeconds (which is outdated)
  const scheduleRoster = availablePlayers.map((p) => ({
    playerId: p.playerId,
    status: (p.status === "field" || p.status === "penalty"
      ? "field"
      : "bench") as "field" | "bench",
    isKeeper: keeperPlayerId === p.playerId,
    totalPlayTimeSeconds: getLivePlayTime(p, currentTimeSeconds),
    // Map positionId to groupId for position-aware substitutions
    groupId: p.positionId ? positionGroupMap[p.positionId] : undefined,
  }));

  const scheduleInput: ScheduleInput = {
    roster: scheduleRoster,
    totalMatchSeconds,
    currentTimeSeconds,
    playersOnField,
    hasKeeper,
    usePositionAwareSubstitutions,
  };

  return calculateSchedule(scheduleInput);
}
