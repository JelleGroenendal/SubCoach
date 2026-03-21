import { describe, it, expect } from "vitest";
import {
  calculatePenaltyRemaining,
  isPenaltyExpired,
  getActivePenalties,
} from "@/engine/timer/penaltyTimer";
import type { MatchEvent } from "@/data/schemas/matchEvent";

describe("calculatePenaltyRemaining", () => {
  it("returns full duration at start", () => {
    expect(calculatePenaltyRemaining(100, 120, 100)).toBe(120);
  });

  it("counts down correctly", () => {
    expect(calculatePenaltyRemaining(100, 120, 160)).toBe(60);
  });

  it("returns 0 when expired", () => {
    expect(calculatePenaltyRemaining(100, 120, 220)).toBe(0);
  });

  it("never returns negative", () => {
    expect(calculatePenaltyRemaining(100, 120, 300)).toBe(0);
  });
});

describe("isPenaltyExpired", () => {
  it("returns false when still running", () => {
    expect(isPenaltyExpired(100, 120, 150)).toBe(false);
  });

  it("returns true when exactly expired", () => {
    expect(isPenaltyExpired(100, 120, 220)).toBe(true);
  });

  it("returns true when past expiry", () => {
    expect(isPenaltyExpired(100, 120, 300)).toBe(true);
  });
});

describe("getActivePenalties", () => {
  it("returns empty array with no events", () => {
    expect(getActivePenalties([], 100)).toEqual([]);
  });

  it("returns active penalty", () => {
    const events: MatchEvent[] = [
      {
        type: "penalty",
        timestamp: 100,
        playerId: "p1",
        durationSeconds: 120,
        penaltyId: "pen1",
      },
    ];
    const result = getActivePenalties(events, 150);
    expect(result).toHaveLength(1);
    expect(result[0]?.playerId).toBe("p1");
    expect(result[0]?.remainingSeconds).toBe(70);
  });

  it("excludes expired penalties", () => {
    const events: MatchEvent[] = [
      {
        type: "penalty",
        timestamp: 100,
        playerId: "p1",
        durationSeconds: 120,
        penaltyId: "pen1",
      },
    ];
    expect(getActivePenalties(events, 300)).toHaveLength(0);
  });

  it("excludes manually ended penalties", () => {
    const events: MatchEvent[] = [
      {
        type: "penalty",
        timestamp: 100,
        playerId: "p1",
        durationSeconds: 120,
        penaltyId: "pen1",
      },
      {
        type: "penaltyEnd",
        timestamp: 130,
        penaltyId: "pen1",
      },
    ];
    expect(getActivePenalties(events, 150)).toHaveLength(0);
  });

  it("handles multiple simultaneous penalties", () => {
    const events: MatchEvent[] = [
      {
        type: "penalty",
        timestamp: 100,
        playerId: "p1",
        durationSeconds: 120,
        penaltyId: "pen1",
      },
      {
        type: "penalty",
        timestamp: 110,
        playerId: "p2",
        durationSeconds: 120,
        penaltyId: "pen2",
      },
    ];
    const result = getActivePenalties(events, 150);
    expect(result).toHaveLength(2);
  });
});
