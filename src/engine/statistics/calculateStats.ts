/**
 * Season statistics calculation functions
 * Pure TypeScript - no React, no side effects
 */

import type { Match, MatchPlayer } from "@/data/schemas";
import type { TeamSeasonStats, PlayerSeasonStats, SeasonStats } from "./types";

/**
 * Calculate team season statistics from finished matches
 */
export function calculateTeamStats(matches: Match[]): TeamSeasonStats {
  const finishedMatches = matches.filter((m) => m.status === "finished");

  if (finishedMatches.length === 0) {
    return {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      goalDifference: 0,
      winPercentage: 0,
      avgGoalsScored: 0,
      avgGoalsConceded: 0,
    };
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsScored = 0;
  let goalsConceded = 0;

  for (const match of finishedMatches) {
    goalsScored += match.homeScore;
    goalsConceded += match.awayScore;

    if (match.homeScore > match.awayScore) {
      wins++;
    } else if (match.homeScore < match.awayScore) {
      losses++;
    } else {
      draws++;
    }
  }

  const matchesPlayed = finishedMatches.length;

  return {
    matchesPlayed,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    goalDifference: goalsScored - goalsConceded,
    winPercentage: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
    avgGoalsScored: matchesPlayed > 0 ? goalsScored / matchesPlayed : 0,
    avgGoalsConceded: matchesPlayed > 0 ? goalsConceded / matchesPlayed : 0,
  };
}

/**
 * Calculate individual player statistics from finished matches
 */
export function calculatePlayerStats(matches: Match[]): PlayerSeasonStats[] {
  const finishedMatches = matches.filter((m) => m.status === "finished");

  if (finishedMatches.length === 0) {
    return [];
  }

  // Aggregate stats per player
  const playerMap = new Map<
    string,
    {
      playerId: string;
      name: string;
      number: number | undefined;
      positionId: string | undefined;
      matchesPlayed: number;
      totalPlayTimeSeconds: number;
      totalMatchTimeSeconds: number;
      goals: number;
      yellowCards: number;
    }
  >();

  for (const match of finishedMatches) {
    const matchDurationSeconds =
      match.periodDurationMinutes * match.periodCount * 60;

    for (const player of match.roster) {
      const existing = playerMap.get(player.playerId);

      // Calculate actual play time from periods (more accurate than totalPlayTimeSeconds)
      const playTimeSeconds = calculatePlayerPlayTime(
        player,
        match.elapsedSeconds,
      );

      if (existing) {
        existing.matchesPlayed++;
        existing.totalPlayTimeSeconds += playTimeSeconds;
        existing.totalMatchTimeSeconds += matchDurationSeconds;
        existing.goals += player.goals;
        existing.yellowCards += player.yellowCards ?? 0;
        // Keep most recent name/number/position
        existing.name = player.name;
        existing.number = player.number;
        existing.positionId = player.positionId;
      } else {
        playerMap.set(player.playerId, {
          playerId: player.playerId,
          name: player.name,
          number: player.number,
          positionId: player.positionId,
          matchesPlayed: 1,
          totalPlayTimeSeconds: playTimeSeconds,
          totalMatchTimeSeconds: matchDurationSeconds,
          goals: player.goals,
          yellowCards: player.yellowCards ?? 0,
        });
      }
    }
  }

  // Convert to array and calculate derived stats
  const result: PlayerSeasonStats[] = [];

  for (const stats of playerMap.values()) {
    const totalPlayTimeMinutes = Math.round(stats.totalPlayTimeSeconds / 60);
    const avgPlayTimeMinutes =
      stats.matchesPlayed > 0
        ? Math.round(stats.totalPlayTimeSeconds / stats.matchesPlayed / 60)
        : 0;
    const playTimePercentage =
      stats.totalMatchTimeSeconds > 0
        ? (stats.totalPlayTimeSeconds / stats.totalMatchTimeSeconds) * 100
        : 0;
    const goalsPerMatch =
      stats.matchesPlayed > 0 ? stats.goals / stats.matchesPlayed : 0;

    result.push({
      playerId: stats.playerId,
      name: stats.name,
      number: stats.number,
      positionId: stats.positionId,
      matchesPlayed: stats.matchesPlayed,
      totalPlayTimeMinutes,
      avgPlayTimeMinutes,
      playTimePercentage,
      goals: stats.goals,
      goalsPerMatch,
      yellowCards: stats.yellowCards,
    });
  }

  // Sort by total play time (most to least)
  result.sort((a, b) => b.totalPlayTimeMinutes - a.totalPlayTimeMinutes);

  return result;
}

/**
 * Calculate actual play time for a player from their periods
 */
function calculatePlayerPlayTime(
  player: MatchPlayer,
  matchElapsedSeconds: number,
): number {
  return player.periods.reduce((sum, period) => {
    const outAt = period.outAt ?? matchElapsedSeconds;
    return sum + (outAt - period.inAt);
  }, 0);
}

/**
 * Calculate complete season statistics
 */
export function calculateSeasonStats(matches: Match[]): SeasonStats {
  const finishedMatches = matches.filter((m) => m.status === "finished");

  // Find date range
  let firstMatchDate: number | undefined;
  let lastMatchDate: number | undefined;

  for (const match of finishedMatches) {
    if (firstMatchDate === undefined || match.date < firstMatchDate) {
      firstMatchDate = match.date;
    }
    if (lastMatchDate === undefined || match.date > lastMatchDate) {
      lastMatchDate = match.date;
    }
  }

  return {
    team: calculateTeamStats(matches),
    players: calculatePlayerStats(matches),
    firstMatchDate,
    lastMatchDate,
  };
}
