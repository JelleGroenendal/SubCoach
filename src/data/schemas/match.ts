import { z } from "zod";
import { MatchEventSchema } from "./matchEvent";

export const MatchStatusSchema = z.enum([
  "setup",
  "playing",
  "paused",
  "halftime",
  "finished",
]);

export const PlayPeriodSchema = z.object({
  inAt: z.number(),
  outAt: z.number().optional(),
});

export const MatchPlayerSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  number: z.number().int().min(1).max(99).optional(),
  /** @deprecated Use positionIds instead */
  positionId: z.string().optional(),
  /** Multiple positions a player can play */
  positionIds: z.array(z.string()).optional(),
  status: z.enum(["field", "bench", "penalty", "injured", "redCard"]),
  totalPlayTimeSeconds: z.number().min(0),
  goals: z.number().int().min(0),
  periods: z.array(PlayPeriodSchema),
  isKeeper: z.boolean().optional(),
  hasBeenSubstitutedOut: z.boolean().optional(),
  yellowCards: z.number().int().min(0).optional(),
  fouls: z.number().int().min(0).optional(),
});

export const MatchSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string(),
  opponentName: z.string().max(100),
  date: z.number(),
  status: MatchStatusSchema,

  periodDurationMinutes: z.number().int().min(5).max(45),
  periodCount: z.number().int().min(1).max(4),
  playersOnField: z.number().int().min(4).max(11),

  currentPeriod: z.number().int().min(1),
  elapsedSeconds: z.number().min(0),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),

  roster: z.array(MatchPlayerSchema),
  events: z.array(MatchEventSchema),

  sportProfileId: z.string().min(1).optional(),
  keeperPlayerId: z.string().optional(),
  substitutionsUsed: z.number().int().min(0).optional(),
  substitutionWindowsUsed: z.number().int().min(0).optional(),
  usePositionAwareSubstitutions: z.boolean().optional(),

  createdAt: z.number(),
  finishedAt: z.number().optional(),
});

export type MatchStatus = z.infer<typeof MatchStatusSchema>;
export type PlayPeriod = z.infer<typeof PlayPeriodSchema>;
export type MatchPlayer = z.infer<typeof MatchPlayerSchema>;
export type Match = z.infer<typeof MatchSchema>;
