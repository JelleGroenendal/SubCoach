import { describe, it, expect } from "vitest";
import {
  PlayerSchema,
  TeamSchema,
  MatchSchema,
  MatchEventSchema,
  SportProfileSchema,
} from "@/data/schemas";
import { handballProfile } from "@/engine/sport-profiles/handball";

describe("PlayerSchema", () => {
  it("validates a correct player", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jan",
      number: 7,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates player without number", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jan",
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "",
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 chars", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "A".repeat(51),
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects number below 1", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jan",
      number: 0,
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects number above 99", () => {
    const result = PlayerSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jan",
      number: 100,
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid uuid", () => {
    const result = PlayerSchema.safeParse({
      id: "not-a-uuid",
      name: "Jan",
      active: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("TeamSchema", () => {
  const validTeam = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "D1 Jongens",
    clubName: "HC Test",
    sportProfileId: "handball",
    settings: {
      periodDurationMinutes: 25,
      periodCount: 2,
      playersOnField: 7,
    },
    players: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("validates a correct team", () => {
    const result = TeamSchema.safeParse(validTeam);
    expect(result.success).toBe(true);
  });

  it("validates team without clubName", () => {
    const { clubName: _, ...teamWithoutClub } = validTeam;
    const result = TeamSchema.safeParse(teamWithoutClub);
    expect(result.success).toBe(true);
  });

  it("rejects period duration below 5", () => {
    const result = TeamSchema.safeParse({
      ...validTeam,
      settings: { ...validTeam.settings, periodDurationMinutes: 4 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects playersOnField below 4", () => {
    const result = TeamSchema.safeParse({
      ...validTeam,
      settings: { ...validTeam.settings, playersOnField: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe("MatchEventSchema", () => {
  it("validates substitution event", () => {
    const result = MatchEventSchema.safeParse({
      type: "substitution",
      timestamp: 300,
      playerInId: "p1",
      playerOutId: "p2",
    });
    expect(result.success).toBe(true);
  });

  it("validates goal event", () => {
    const result = MatchEventSchema.safeParse({
      type: "goal",
      timestamp: 450,
      playerId: "p1",
    });
    expect(result.success).toBe(true);
  });

  it("validates opponent goal event", () => {
    const result = MatchEventSchema.safeParse({
      type: "opponentGoal",
      timestamp: 600,
    });
    expect(result.success).toBe(true);
  });

  it("validates penalty event", () => {
    const result = MatchEventSchema.safeParse({
      type: "penalty",
      timestamp: 700,
      playerId: "p3",
      durationSeconds: 120,
      penaltyId: "pen1",
    });
    expect(result.success).toBe(true);
  });

  it("validates red card event", () => {
    const result = MatchEventSchema.safeParse({
      type: "redCard",
      timestamp: 800,
      playerId: "p4",
    });
    expect(result.success).toBe(true);
  });

  it("validates period start event", () => {
    const result = MatchEventSchema.safeParse({
      type: "periodStart",
      timestamp: 0,
      period: 1,
    });
    expect(result.success).toBe(true);
  });

  it("validates undo event", () => {
    const result = MatchEventSchema.safeParse({
      type: "undo",
      timestamp: 900,
      undoneEventIndex: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = MatchEventSchema.safeParse({
      type: "unknown",
      timestamp: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("MatchSchema", () => {
  it("validates a minimal match", () => {
    const result = MatchSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      teamId: "team1",
      opponentName: "HC Tegenstander",
      date: Date.now(),
      status: "setup",
      periodDurationMinutes: 25,
      periodCount: 2,
      playersOnField: 7,
      currentPeriod: 1,
      elapsedSeconds: 0,
      homeScore: 0,
      awayScore: 0,
      roster: [],
      events: [],
      createdAt: Date.now(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = MatchSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      teamId: "team1",
      opponentName: "Test",
      date: Date.now(),
      status: "invalid",
      periodDurationMinutes: 25,
      periodCount: 2,
      playersOnField: 7,
      currentPeriod: 1,
      elapsedSeconds: 0,
      homeScore: 0,
      awayScore: 0,
      roster: [],
      events: [],
      createdAt: Date.now(),
    });
    expect(result.success).toBe(false);
  });
});

describe("SportProfileSchema", () => {
  it("validates the handball profile", () => {
    const result = SportProfileSchema.safeParse(handballProfile);
    expect(result.success).toBe(true);
  });

  it("rejects profile without id", () => {
    const { id: _, ...noId } = handballProfile;
    const result = SportProfileSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });
});
