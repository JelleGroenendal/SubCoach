import { describe, it, expect } from "vitest";
import { handballProfile } from "@/engine/sport-profiles/handball";
import {
  getSportProfile,
  getAllSportProfiles,
  getSportProfileOrThrow,
} from "@/engine/sport-profiles";

describe("handball profile", () => {
  it("has correct id", () => {
    expect(handballProfile.id).toBe("handball");
  });

  it("defaults to 2 periods", () => {
    expect(handballProfile.match.defaultPeriodCount).toBe(2);
  });

  it("defaults to 25 minute periods", () => {
    expect(handballProfile.match.defaultPeriodDurationMinutes).toBe(25);
  });

  it("defaults to 7 players on field", () => {
    expect(handballProfile.players.defaultPlayersOnField).toBe(7);
  });

  it("has a keeper", () => {
    expect(handballProfile.players.hasKeeper).toBe(true);
  });

  it("has unlimited flying substitutions", () => {
    expect(handballProfile.substitutions.unlimited).toBe(true);
    expect(handballProfile.substitutions.flying).toBe(true);
    expect(handballProfile.substitutions.canSubBack).toBe(true);
  });

  it("has 2-minute time penalty", () => {
    expect(handballProfile.penalties.timePenalties).toHaveLength(1);
    expect(handballProfile.penalties.timePenalties[0]?.durationSeconds).toBe(
      120,
    );
    expect(handballProfile.penalties.timePenalties[0]?.teamPlaysShort).toBe(
      true,
    );
  });

  it("has yellow and red cards", () => {
    expect(handballProfile.penalties.cards).toEqual(["yellow", "red"]);
  });

  it("3rd penalty results in red card", () => {
    expect(handballProfile.penalties.maxTimePenalties).toBe(3);
  });

  it("penalty does not end on goal", () => {
    expect(handballProfile.penalties.penaltyEndsOnGoal).toBe(false);
  });

  it("scoring is goals with value 1", () => {
    expect(handballProfile.scoring.type).toBe("goals");
    expect(handballProfile.scoring.values).toEqual([1]);
  });
});

describe("sport profile registry", () => {
  it("returns handball profile by id", () => {
    const profile = getSportProfile("handball");
    expect(profile).toBeDefined();
    expect(profile?.id).toBe("handball");
  });

  it("returns undefined for unknown id", () => {
    expect(getSportProfile("curling")).toBeUndefined();
  });

  it("returns all profiles", () => {
    const all = getAllSportProfiles();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((p) => p.id === "handball")).toBe(true);
  });

  it("throws for unknown id with getSportProfileOrThrow", () => {
    expect(() => getSportProfileOrThrow("curling")).toThrow();
  });
});
