import { describe, it, expect } from "vitest";
import {
  calculateTeamStats,
  calculatePlayerStats,
  calculateSeasonStats,
} from "@/engine/statistics";
import type { Match } from "@/data/schemas";

function createMockMatch(
  homeScore: number,
  awayScore: number,
  roster: Array<{
    playerId: string;
    name: string;
    goals: number;
    periods: Array<{ inAt: number; outAt?: number }>;
  }>,
): Match {
  return {
    id: crypto.randomUUID(),
    teamId: "team-1",
    opponentName: "Opponent",
    date: Date.now(),
    status: "finished",
    periodDurationMinutes: 25,
    periodCount: 2,
    playersOnField: 7,
    currentPeriod: 2,
    elapsedSeconds: 3000, // 50 minutes
    homeScore,
    awayScore,
    roster: roster.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      number: undefined,
      status: "bench" as const,
      totalPlayTimeSeconds: 0,
      goals: p.goals,
      periods: p.periods,
    })),
    events: [],
    createdAt: Date.now(),
    finishedAt: Date.now(),
  };
}

describe("calculateTeamStats", () => {
  it("returns zeros for empty match list", () => {
    const stats = calculateTeamStats([]);
    expect(stats.matchesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.losses).toBe(0);
  });

  it("calculates win/draw/loss correctly", () => {
    const matches: Match[] = [
      createMockMatch(3, 1, []), // win
      createMockMatch(2, 2, []), // draw
      createMockMatch(1, 4, []), // loss
      createMockMatch(5, 0, []), // win
    ];

    const stats = calculateTeamStats(matches);
    expect(stats.matchesPlayed).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.draws).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winPercentage).toBe(50);
  });

  it("calculates goal statistics correctly", () => {
    const matches: Match[] = [
      createMockMatch(3, 1, []),
      createMockMatch(2, 2, []),
      createMockMatch(1, 4, []),
    ];

    const stats = calculateTeamStats(matches);
    expect(stats.goalsScored).toBe(6); // 3 + 2 + 1
    expect(stats.goalsConceded).toBe(7); // 1 + 2 + 4
    expect(stats.goalDifference).toBe(-1);
    expect(stats.avgGoalsScored).toBe(2);
    expect(stats.avgGoalsConceded).toBeCloseTo(2.33, 1);
  });

  it("ignores non-finished matches", () => {
    const finishedMatch = createMockMatch(3, 1, []);
    const playingMatch = createMockMatch(5, 0, []);
    playingMatch.status = "playing";

    const stats = calculateTeamStats([finishedMatch, playingMatch]);
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.goalsScored).toBe(3);
  });
});

describe("calculatePlayerStats", () => {
  it("returns empty array for no matches", () => {
    const stats = calculatePlayerStats([]);
    expect(stats).toEqual([]);
  });

  it("calculates player stats correctly", () => {
    const matches: Match[] = [
      createMockMatch(3, 1, [
        {
          playerId: "player-1",
          name: "Alice",
          goals: 2,
          periods: [{ inAt: 0, outAt: 1500 }], // 25 min
        },
        {
          playerId: "player-2",
          name: "Bob",
          goals: 1,
          periods: [{ inAt: 0, outAt: 3000 }], // 50 min (full match)
        },
      ]),
      createMockMatch(2, 0, [
        {
          playerId: "player-1",
          name: "Alice",
          goals: 1,
          periods: [{ inAt: 0, outAt: 2000 }], // ~33 min
        },
        {
          playerId: "player-2",
          name: "Bob",
          goals: 1,
          periods: [{ inAt: 0, outAt: 1000 }], // ~17 min
        },
      ]),
    ];

    const stats = calculatePlayerStats(matches);
    expect(stats.length).toBe(2);

    // Stats are sorted by play time (Bob has more total time)
    const alice = stats.find((p) => p.name === "Alice")!;
    const bob = stats.find((p) => p.name === "Bob")!;

    expect(alice.matchesPlayed).toBe(2);
    expect(alice.goals).toBe(3);
    // Alice: 25 + 33 = 58 min total
    expect(alice.totalPlayTimeMinutes).toBe(58);
    expect(alice.avgPlayTimeMinutes).toBe(29);

    expect(bob.matchesPlayed).toBe(2);
    expect(bob.goals).toBe(2);
    // Bob: 50 + 17 = 67 min total (rounded)
    expect(bob.totalPlayTimeMinutes).toBe(67);
    // Average: 67/2 = 33.5 -> rounds to 34 or 33 depending on implementation
    expect(bob.avgPlayTimeMinutes).toBeGreaterThanOrEqual(33);
    expect(bob.avgPlayTimeMinutes).toBeLessThanOrEqual(34);
  });

  it("calculates play time percentage correctly", () => {
    const matches: Match[] = [
      createMockMatch(1, 0, [
        {
          playerId: "player-1",
          name: "Alice",
          goals: 0,
          periods: [{ inAt: 0, outAt: 3000 }], // Full match
        },
      ]),
    ];

    const stats = calculatePlayerStats(matches);
    expect(stats[0].playTimePercentage).toBe(100);
  });
});

describe("calculateSeasonStats", () => {
  it("combines team and player stats", () => {
    const matches: Match[] = [
      createMockMatch(3, 1, [
        {
          playerId: "player-1",
          name: "Alice",
          goals: 2,
          periods: [{ inAt: 0, outAt: 1500 }],
        },
      ]),
    ];

    const stats = calculateSeasonStats(matches);
    expect(stats.team.matchesPlayed).toBe(1);
    expect(stats.team.wins).toBe(1);
    expect(stats.players.length).toBe(1);
    expect(stats.players[0].goals).toBe(2);
  });

  it("tracks date range", () => {
    const now = Date.now();
    const yesterday = now - 86400000;

    const match1 = createMockMatch(1, 0, []);
    match1.date = yesterday;

    const match2 = createMockMatch(2, 1, []);
    match2.date = now;

    const stats = calculateSeasonStats([match1, match2]);
    expect(stats.firstMatchDate).toBe(yesterday);
    expect(stats.lastMatchDate).toBe(now);
  });
});
