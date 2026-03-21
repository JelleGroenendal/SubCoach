import type { MatchPlayer } from "@/data/schemas/match";

export type PlayTimeStats = {
  playerId: string;
  name: string;
  totalSeconds: number;
  percentage: number;
};

export type FairnessResult = {
  score: number; // 0-100, 100 = perfectly equal
  distribution: PlayTimeStats[];
  averageSeconds: number;
  maxDeviation: number;
};

/**
 * Calculate play time distribution for all outfield players.
 * Pure function: same input always produces same output.
 */
export function calculatePlayTimeDistribution(
  roster: MatchPlayer[],
): PlayTimeStats[] {
  const outfield = roster.filter(
    (p) => p.status !== "injured" && p.status !== "redCard",
  );
  const totalTime = outfield.reduce(
    (sum, p) => sum + p.totalPlayTimeSeconds,
    0,
  );

  return outfield.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    totalSeconds: p.totalPlayTimeSeconds,
    percentage: totalTime > 0 ? (p.totalPlayTimeSeconds / totalTime) * 100 : 0,
  }));
}

/**
 * Calculate a fairness score from 0-100.
 * 100 = all players have identical play time.
 * 0 = maximum inequality (one player played everything).
 */
export function calculateFairnessScore(roster: MatchPlayer[]): FairnessResult {
  const distribution = calculatePlayTimeDistribution(roster);

  if (distribution.length === 0) {
    return { score: 100, distribution, averageSeconds: 0, maxDeviation: 0 };
  }

  const totalSeconds = distribution.reduce((sum, p) => sum + p.totalSeconds, 0);
  const averageSeconds = totalSeconds / distribution.length;

  if (averageSeconds === 0) {
    return { score: 100, distribution, averageSeconds: 0, maxDeviation: 0 };
  }

  // Calculate standard deviation as percentage of average
  const squaredDiffs = distribution.map(
    (p) => (p.totalSeconds - averageSeconds) ** 2,
  );
  const variance =
    squaredDiffs.reduce((sum, d) => sum + d, 0) / distribution.length;
  const stdDev = Math.sqrt(variance);

  // Max deviation: difference between max and min play time
  const maxTime = Math.max(...distribution.map((p) => p.totalSeconds));
  const minTime = Math.min(...distribution.map((p) => p.totalSeconds));
  const maxDeviation = maxTime - minTime;

  // Score: 100 - (coefficient of variation * 100), clamped to 0-100
  const coefficientOfVariation = stdDev / averageSeconds;
  const score = Math.round(
    Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100)),
  );

  return { score, distribution, averageSeconds, maxDeviation };
}

/**
 * Get players who have played below a threshold (in seconds).
 */
export function getUnderplayedPlayers(
  roster: MatchPlayer[],
  thresholdSeconds: number,
): MatchPlayer[] {
  return roster.filter(
    (p) =>
      p.status !== "injured" &&
      p.status !== "redCard" &&
      p.totalPlayTimeSeconds < thresholdSeconds,
  );
}
