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
};

/**
 * Recalculate substitution schedule based on current match state.
 * Called after any disruption: penalty, injury, red card, manual sub, period change.
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
  } = input;

  // Filter out unavailable players (injured, red card)
  const availablePlayers = roster.filter(
    (p) => p.status !== "injured" && p.status !== "redCard",
  );

  // Build schedule input from current state
  const scheduleRoster = availablePlayers.map((p) => ({
    playerId: p.playerId,
    status: (p.status === "field" || p.status === "penalty"
      ? "field"
      : "bench") as "field" | "bench",
    isKeeper: keeperPlayerId === p.playerId,
    totalPlayTimeSeconds: p.totalPlayTimeSeconds,
  }));

  const scheduleInput: ScheduleInput = {
    roster: scheduleRoster,
    totalMatchSeconds,
    currentTimeSeconds,
    playersOnField,
    hasKeeper,
  };

  return calculateSchedule(scheduleInput);
}
