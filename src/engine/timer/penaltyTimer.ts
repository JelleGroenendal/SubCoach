import type { MatchEvent, PenaltyEvent } from "@/data/schemas/matchEvent";

/**
 * Pure penalty timer calculations.
 * No side effects - time is always passed as parameter.
 */

export type ActivePenalty = {
  penaltyId: string;
  playerId: string;
  startTimestamp: number;
  durationSeconds: number;
  remainingSeconds: number;
};

export function calculatePenaltyRemaining(
  penaltyStartTime: number,
  durationSeconds: number,
  currentTime: number,
): number {
  const elapsed = currentTime - penaltyStartTime;
  return Math.max(0, durationSeconds - elapsed);
}

export function isPenaltyExpired(
  penaltyStartTime: number,
  durationSeconds: number,
  currentTime: number,
): boolean {
  return (
    calculatePenaltyRemaining(penaltyStartTime, durationSeconds, currentTime) <=
    0
  );
}

export function getActivePenalties(
  events: MatchEvent[],
  currentTime: number,
): ActivePenalty[] {
  const penalties: ActivePenalty[] = [];
  const endedPenaltyIds = new Set<string>();

  // Collect ended penalties
  for (const event of events) {
    if (event.type === "penaltyEnd") {
      endedPenaltyIds.add(event.penaltyId);
    }
  }

  // Find active penalties (including those that just expired but haven't been ended yet)
  for (const event of events) {
    if (event.type === "penalty" && !endedPenaltyIds.has(event.penaltyId)) {
      const penaltyEvent = event as PenaltyEvent;
      const remaining = calculatePenaltyRemaining(
        penaltyEvent.timestamp,
        penaltyEvent.durationSeconds,
        currentTime,
      );

      // Include all penalties that haven't been formally ended yet
      // This allows the UI to detect expired penalties and call endPenalty
      penalties.push({
        penaltyId: penaltyEvent.penaltyId,
        playerId: penaltyEvent.playerId,
        startTimestamp: penaltyEvent.timestamp,
        durationSeconds: penaltyEvent.durationSeconds,
        remainingSeconds: remaining,
      });
    }
  }

  return penalties;
}
