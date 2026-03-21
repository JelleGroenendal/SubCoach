import { z } from "zod";

export const TimePenaltyConfigSchema = z.object({
  name: z.string(),
  durationSeconds: z.number().int().min(1),
  teamPlaysShort: z.boolean(),
});

export const SportProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  match: z.object({
    defaultPeriodCount: z.number().int().min(1).max(4),
    defaultPeriodDurationMinutes: z.number().int().min(5).max(45),
    hasTimeout: z.boolean(),
  }),

  players: z.object({
    defaultPlayersOnField: z.number().int().min(4).max(11),
    hasKeeper: z.boolean(),
  }),

  substitutions: z.object({
    unlimited: z.boolean(),
    flying: z.boolean(),
    maxSubstitutions: z.number().int().min(1).optional(),
    canSubBack: z.boolean(),
  }),

  penalties: z.object({
    timePenalties: z.array(TimePenaltyConfigSchema),
    maxTimePenalties: z.number().int().min(1).optional(),
    cards: z.array(z.string()),
    personalFoulLimit: z.number().int().min(1).optional(),
    penaltyEndsOnGoal: z.boolean(),
  }),

  scoring: z.object({
    type: z.enum(["goals", "points"]),
    values: z.array(z.number().int().min(1)),
  }),
});

export type TimePenaltyConfig = z.infer<typeof TimePenaltyConfigSchema>;
export type SportProfile = z.infer<typeof SportProfileSchema>;
