import { z } from "zod";

export const TimePenaltyConfigSchema = z.object({
  name: z.string(),
  durationSeconds: z.number().int().min(1),
  teamPlaysShort: z.boolean(),
  endsOnGoal: z.boolean(),
});

export const ScoringValueSchema = z.object({
  name: z.string(),
  value: z.number().int().min(1),
});

export const SportProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  match: z.object({
    defaultPeriodCount: z.number().int().min(1).max(4),
    defaultPeriodDurationMinutes: z.number().int().min(5).max(45),
    hasTimeout: z.boolean(),
    stoppedClock: z.boolean(),
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
    substitutionWindows: z.number().int().min(1).optional(),
  }),

  penalties: z.object({
    timePenalties: z.array(TimePenaltyConfigSchema),
    maxTimePenalties: z.number().int().min(1).optional(),
    cards: z.array(z.string()),
    secondYellowIsRed: z.boolean(),
    redCardPermanent: z.boolean(),
    personalFoulLimit: z.number().int().min(1).optional(),
  }),

  scoring: z.object({
    type: z.enum(["goals", "points"]),
    values: z.array(ScoringValueSchema),
  }),
});

export type TimePenaltyConfig = z.infer<typeof TimePenaltyConfigSchema>;
export type ScoringValue = z.infer<typeof ScoringValueSchema>;
export type SportProfile = z.infer<typeof SportProfileSchema>;
