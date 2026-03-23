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

export const PositionGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // i18n key
});

export const PositionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // i18n key
  abbreviation: z.string().min(1), // i18n key for short form (not the actual abbreviation)
  isKeeper: z.boolean().optional(),
  groupId: z.string().optional(), // references PositionGroup.id
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
    positionGroups: z.array(PositionGroupSchema).optional(),
    positions: z.array(PositionSchema).optional(),
  }),

  substitutions: z.object({
    unlimited: z.boolean(),
    flying: z.boolean(),
    maxSubstitutions: z.number().int().min(1).optional(),
    canSubBack: z.boolean(),
    substitutionWindows: z.number().int().min(1).optional(),
    injuryAllowsReplacement: z.boolean().optional(), // If true, injured player can be replaced immediately (no playing short)
    // Substitution interval presets (in minutes) - sport-specific options
    intervalPresetsMinutes: z.array(z.number().int().min(1).max(30)).optional(),
    defaultIntervalMinutes: z.number().int().min(1).max(30).optional(),
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
export type PositionGroup = z.infer<typeof PositionGroupSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type SportProfile = z.infer<typeof SportProfileSchema>;
