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

  // Find active penalties
  for (const event of events) {
    if (event.type === "penalty" && !endedPenaltyIds.has(event.penaltyId)) {
      const penaltyEvent = event as PenaltyEvent;
      const remaining = calculatePenaltyRemaining(
        penaltyEvent.timestamp,
        penaltyEvent.durationSeconds,
        currentTime,
      );

      if (remaining > 0) {
        penalties.push({
          penaltyId: penaltyEvent.penaltyId,
          playerId: penaltyEvent.playerId,
          startTimestamp: penaltyEvent.timestamp,
          durationSeconds: penaltyEvent.durationSeconds,
          remainingSeconds: remaining,
        });
      }
    }
  }

  return penalties;
}
