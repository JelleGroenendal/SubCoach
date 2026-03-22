/**
 * Season statistics types
 * Pure TypeScript - no React, no side effects
 */

export interface TeamSeasonStats {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  winPercentage: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

export interface PlayerSeasonStats {
  playerId: string;
  name: string;
  number: number | undefined;
  positionId: string | undefined;
  matchesPlayed: number;
  totalPlayTimeMinutes: number;
  avgPlayTimeMinutes: number;
  playTimePercentage: number; // % of total match time played
  goals: number;
  goalsPerMatch: number;
  yellowCards: number;
}

export interface SeasonStats {
  team: TeamSeasonStats;
  players: PlayerSeasonStats[];
  // Time range
  firstMatchDate: number | undefined;
  lastMatchDate: number | undefined;
}
