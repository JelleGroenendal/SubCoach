import { describe, it, expect } from "vitest";
import {
  calculatePlayTimeDistribution,
  calculateFairnessScore,
  getUnderplayedPlayers,
} from "@/engine/fairness/calculateFairness";
import type { MatchPlayer } from "@/data/schemas/match";

function makePlayer(
  overrides: Partial<MatchPlayer> & { playerId: string },
): MatchPlayer {
  return {
    name: overrides.playerId,
    status: "bench",
    totalPlayTimeSeconds: 0,
    goals: 0,
    periods: [],
    ...overrides,
  };
}

describe("calculatePlayTimeDistribution", () => {
  it("returns empty for empty roster", () => {
    expect(calculatePlayTimeDistribution([])).toEqual([]);
  });

  it("calculates percentages correctly", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 400 }),
    ];
    const dist = calculatePlayTimeDistribution(roster);
    expect(dist).toHaveLength(2);
    expect(dist[0]?.percentage).toBe(60);
    expect(dist[1]?.percentage).toBe(40);
  });

  it("excludes injured and red-carded players", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({
        playerId: "p2",
        totalPlayTimeSeconds: 300,
        status: "injured",
      }),
      makePlayer({
        playerId: "p3",
        totalPlayTimeSeconds: 0,
        status: "redCard",
      }),
    ];
    const dist = calculatePlayTimeDistribution(roster);
    expect(dist).toHaveLength(1);
  });
});

describe("calculateFairnessScore", () => {
  it("returns 100 for empty roster", () => {
    const result = calculateFairnessScore([]);
    expect(result.score).toBe(100);
  });

  it("returns 100 for perfectly equal play times", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p3", totalPlayTimeSeconds: 600 }),
    ];
    const result = calculateFairnessScore(roster);
    expect(result.score).toBe(100);
    expect(result.maxDeviation).toBe(0);
  });

  it("returns lower score for unequal play times", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 1200 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 300 }),
    ];
    const result = calculateFairnessScore(roster);
    expect(result.score).toBeLessThan(100);
    expect(result.maxDeviation).toBe(900);
  });

  it("returns 100 when all times are zero", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 0 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 0 }),
    ];
    const result = calculateFairnessScore(roster);
    expect(result.score).toBe(100);
  });

  it("calculates average correctly", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 400 }),
    ];
    const result = calculateFairnessScore(roster);
    expect(result.averageSeconds).toBe(500);
  });
});

describe("getUnderplayedPlayers", () => {
  it("returns empty when all above threshold", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 500 }),
    ];
    expect(getUnderplayedPlayers(roster, 300)).toHaveLength(0);
  });

  it("returns players below threshold", () => {
    const roster: MatchPlayer[] = [
      makePlayer({ playerId: "p1", totalPlayTimeSeconds: 600 }),
      makePlayer({ playerId: "p2", totalPlayTimeSeconds: 100 }),
      makePlayer({ playerId: "p3", totalPlayTimeSeconds: 50 }),
    ];
    const result = getUnderplayedPlayers(roster, 200);
    expect(result).toHaveLength(2);
  });

  it("excludes injured and red-carded players", () => {
    const roster: MatchPlayer[] = [
      makePlayer({
        playerId: "p1",
        totalPlayTimeSeconds: 0,
        status: "injured",
      }),
      makePlayer({
        playerId: "p2",
        totalPlayTimeSeconds: 0,
        status: "redCard",
      }),
      makePlayer({ playerId: "p3", totalPlayTimeSeconds: 0 }),
    ];
    const result = getUnderplayedPlayers(roster, 200);
    expect(result).toHaveLength(1);
    expect(result[0]?.playerId).toBe("p3");
  });
});
