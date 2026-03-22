import { describe, it, expect } from "vitest";
import { calculateSchedule } from "@/engine/substitution/calculateSchedule";
import { recalculateSchedule } from "@/engine/substitution/recalculate";
import type { ScheduleInput } from "@/engine/substitution/types";
import type { MatchPlayer } from "@/data/schemas/match";

function makeRosterItem(
  id: string,
  status: "field" | "bench",
  isKeeper = false,
  playTime = 0,
): ScheduleInput["roster"][number] {
  return {
    playerId: id,
    status,
    isKeeper,
    totalPlayTimeSeconds: playTime,
  };
}

describe("calculateSchedule", () => {
  it("returns empty when all players fit on field", () => {
    const input: ScheduleInput = {
      roster: [
        makeRosterItem("k", "field", true),
        makeRosterItem("p1", "field"),
        makeRosterItem("p2", "field"),
        makeRosterItem("p3", "field"),
        makeRosterItem("p4", "field"),
        makeRosterItem("p5", "field"),
        makeRosterItem("p6", "field"),
      ],
      totalMatchSeconds: 3000,
      currentTimeSeconds: 0,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    expect(result.suggestions).toHaveLength(0);
  });

  it("generates substitutions when there is a play time imbalance", () => {
    // Field players have 600s each, bench players have 0s
    // This creates an imbalance that should trigger a suggestion
    const input: ScheduleInput = {
      roster: [
        makeRosterItem("k", "field", true),
        makeRosterItem("p1", "field", false, 600),
        makeRosterItem("p2", "field", false, 600),
        makeRosterItem("p3", "field", false, 600),
        makeRosterItem("p4", "field", false, 600),
        makeRosterItem("p5", "field", false, 600),
        makeRosterItem("p6", "field", false, 600),
        makeRosterItem("p7", "bench", false, 0),
        makeRosterItem("p8", "bench", false, 0),
        makeRosterItem("p9", "bench", false, 0),
      ],
      totalMatchSeconds: 3000,
      currentTimeSeconds: 600,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    expect(result.suggestions.length).toBeGreaterThan(0);
    // The first suggestion should be for NOW (fairness-based)
    const first = result.suggestions[0];
    expect(first).toBeDefined();
    expect(first!.reason).toBe("fairness");
    // Player coming in should be one with least play time (0s)
    expect(["p7", "p8", "p9"]).toContain(first!.playerInId);
    // Player going out should be one with most play time (600s)
    expect(["p1", "p2", "p3", "p4", "p5", "p6"]).toContain(first!.playerOutId);
  });

  it("returns empty when play times are equal (no imbalance)", () => {
    // All players have equal play time - no substitution needed yet
    const input: ScheduleInput = {
      roster: [
        makeRosterItem("k", "field", true),
        makeRosterItem("p1", "field", false, 300),
        makeRosterItem("p2", "field", false, 300),
        makeRosterItem("p3", "field", false, 300),
        makeRosterItem("p4", "field", false, 300),
        makeRosterItem("p5", "field", false, 300),
        makeRosterItem("p6", "field", false, 300),
        makeRosterItem("p7", "bench", false, 300),
        makeRosterItem("p8", "bench", false, 300),
      ],
      totalMatchSeconds: 3000,
      currentTimeSeconds: 300,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    // No suggestions when everyone has equal play time
    expect(result.suggestions).toHaveLength(0);
  });

  it("returns empty when no time remaining", () => {
    const input: ScheduleInput = {
      roster: [
        makeRosterItem("k", "field", true),
        makeRosterItem("p1", "field"),
        makeRosterItem("p2", "bench"),
      ],
      totalMatchSeconds: 3000,
      currentTimeSeconds: 3000,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    expect(result.suggestions).toHaveLength(0);
  });

  it("suggests immediate substitution when imbalance exists mid-match", () => {
    const input: ScheduleInput = {
      roster: [
        makeRosterItem("k", "field", true),
        makeRosterItem("p1", "field", false, 600),
        makeRosterItem("p2", "field", false, 600),
        makeRosterItem("p3", "field", false, 600),
        makeRosterItem("p4", "field", false, 600),
        makeRosterItem("p5", "field", false, 600),
        makeRosterItem("p6", "field", false, 600),
        makeRosterItem("p7", "bench", false, 0),
        makeRosterItem("p8", "bench", false, 0),
      ],
      totalMatchSeconds: 3000,
      currentTimeSeconds: 1500,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    expect(result.suggestions.length).toBeGreaterThan(0);
    // First suggestion should be for current time (immediate)
    expect(result.suggestions[0]!.timestamp).toBe(1500);
    expect(result.suggestions[0]!.reason).toBe("fairness");
  });

  it("warns when too many players for remaining time", () => {
    const roster = [makeRosterItem("k", "field", true)];
    for (let i = 0; i < 20; i++) {
      roster.push(makeRosterItem(`p${i}`, i < 6 ? "field" : "bench"));
    }
    const input: ScheduleInput = {
      roster,
      totalMatchSeconds: 60,
      currentTimeSeconds: 0,
      playersOnField: 7,
      hasKeeper: true,
    };
    const result = calculateSchedule(input);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("recalculateSchedule", () => {
  function makeMatchPlayer(
    id: string,
    status: MatchPlayer["status"],
    playTime = 0,
  ): MatchPlayer {
    return {
      playerId: id,
      name: id,
      status,
      totalPlayTimeSeconds: playTime,
      goals: 0,
      periods: [],
    };
  }

  it("excludes injured players from schedule", () => {
    const roster: MatchPlayer[] = [
      makeMatchPlayer("k", "field"),
      makeMatchPlayer("p1", "field", 600),
      makeMatchPlayer("p2", "field", 600),
      makeMatchPlayer("p3", "field", 600),
      makeMatchPlayer("p4", "field", 600),
      makeMatchPlayer("p5", "field", 600),
      makeMatchPlayer("p6", "field", 600),
      makeMatchPlayer("p7", "bench", 0),
      makeMatchPlayer("p8", "injured", 300),
    ];
    const result = recalculateSchedule({
      roster,
      totalMatchSeconds: 3000,
      currentTimeSeconds: 1500,
      playersOnField: 7,
      hasKeeper: true,
      keeperPlayerId: "k",
    });
    // Should not reference injured player
    for (const s of result.suggestions) {
      expect(s.playerInId).not.toBe("p8");
      expect(s.playerOutId).not.toBe("p8");
    }
  });

  it("excludes red-carded players from schedule", () => {
    const roster: MatchPlayer[] = [
      makeMatchPlayer("k", "field"),
      makeMatchPlayer("p1", "field", 600),
      makeMatchPlayer("p2", "field", 600),
      makeMatchPlayer("p3", "field", 600),
      makeMatchPlayer("p4", "field", 600),
      makeMatchPlayer("p5", "field", 600),
      makeMatchPlayer("p6", "bench", 0),
      makeMatchPlayer("p7", "bench", 0),
      makeMatchPlayer("p8", "redCard", 300),
    ];
    const result = recalculateSchedule({
      roster,
      totalMatchSeconds: 3000,
      currentTimeSeconds: 1500,
      playersOnField: 7,
      hasKeeper: true,
      keeperPlayerId: "k",
    });
    for (const s of result.suggestions) {
      expect(s.playerInId).not.toBe("p8");
      expect(s.playerOutId).not.toBe("p8");
    }
  });
});
