import { describe, it, expect } from "vitest";
import {
  calculateElapsed,
  calculateRemainingInPeriod,
  isPeriodFinished,
  isMatchFinished,
  formatTime,
  getTotalMatchSeconds,
} from "@/engine/timer/matchTimer";

describe("calculateElapsed", () => {
  it("returns elapsed time without pauses", () => {
    expect(calculateElapsed(0, [], 300)).toBe(300);
  });

  it("subtracts pause durations", () => {
    expect(calculateElapsed(0, [30, 20], 300)).toBe(250);
  });

  it("returns 0 when currentTime equals startTime", () => {
    expect(calculateElapsed(100, [], 100)).toBe(0);
  });

  it("never returns negative", () => {
    expect(calculateElapsed(100, [200], 150)).toBe(0);
  });
});

describe("calculateRemainingInPeriod", () => {
  it("returns remaining seconds", () => {
    expect(calculateRemainingInPeriod(600, 1500)).toBe(900);
  });

  it("returns 0 when period is over", () => {
    expect(calculateRemainingInPeriod(1500, 1500)).toBe(0);
  });

  it("never returns negative", () => {
    expect(calculateRemainingInPeriod(1600, 1500)).toBe(0);
  });
});

describe("isPeriodFinished", () => {
  it("returns false when time remains", () => {
    expect(isPeriodFinished(600, 1500)).toBe(false);
  });

  it("returns true when elapsed equals duration", () => {
    expect(isPeriodFinished(1500, 1500)).toBe(true);
  });

  it("returns true when elapsed exceeds duration", () => {
    expect(isPeriodFinished(1501, 1500)).toBe(true);
  });
});

describe("isMatchFinished", () => {
  it("returns false in first period", () => {
    expect(isMatchFinished(1, 2, 1500, 1500)).toBe(false);
  });

  it("returns false in last period with time remaining", () => {
    expect(isMatchFinished(2, 2, 600, 1500)).toBe(false);
  });

  it("returns true in last period when time is up", () => {
    expect(isMatchFinished(2, 2, 1500, 1500)).toBe(true);
  });

  it("handles 3-period match", () => {
    expect(isMatchFinished(3, 3, 1200, 1200)).toBe(true);
    expect(isMatchFinished(2, 3, 1200, 1200)).toBe(false);
  });
});

describe("formatTime", () => {
  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125)).toBe("02:05");
  });

  it("formats large times", () => {
    expect(formatTime(3599)).toBe("59:59");
  });

  it("pads single digits", () => {
    expect(formatTime(61)).toBe("01:01");
  });
});

describe("getTotalMatchSeconds", () => {
  it("calculates for 2x25 min", () => {
    expect(getTotalMatchSeconds(25, 2)).toBe(3000);
  });

  it("calculates for 2x30 min", () => {
    expect(getTotalMatchSeconds(30, 2)).toBe(3600);
  });

  it("calculates for 3x20 min", () => {
    expect(getTotalMatchSeconds(20, 3)).toBe(3600);
  });
});
