import { z } from "zod";

export const SubstitutionEventSchema = z.object({
  type: z.literal("substitution"),
  timestamp: z.number(),
  playerInId: z.string(),
  playerOutId: z.string(),
});

export const GoalEventSchema = z.object({
  type: z.literal("goal"),
  timestamp: z.number(),
  playerId: z.string(),
});

export const OpponentGoalEventSchema = z.object({
  type: z.literal("opponentGoal"),
  timestamp: z.number(),
});

export const PenaltyEventSchema = z.object({
  type: z.literal("penalty"),
  timestamp: z.number(),
  playerId: z.string(),
  durationSeconds: z.number().int().min(1),
  penaltyId: z.string(),
});

export const PenaltyEndEventSchema = z.object({
  type: z.literal("penaltyEnd"),
  timestamp: z.number(),
  penaltyId: z.string(),
});

export const YellowCardEventSchema = z.object({
  type: z.literal("yellowCard"),
  timestamp: z.number(),
  playerId: z.string(),
});

export const RedCardEventSchema = z.object({
  type: z.literal("redCard"),
  timestamp: z.number(),
  playerId: z.string(),
  wasSecondYellow: z.boolean().optional(),
});

export const InjuryEventSchema = z.object({
  type: z.literal("injury"),
  timestamp: z.number(),
  playerId: z.string(),
});

export const InjuryRecoveryEventSchema = z.object({
  type: z.literal("injuryRecovery"),
  timestamp: z.number(),
  playerId: z.string(),
});

export const PeriodStartEventSchema = z.object({
  type: z.literal("periodStart"),
  timestamp: z.number(),
  period: z.number().int().min(1),
});

export const PeriodEndEventSchema = z.object({
  type: z.literal("periodEnd"),
  timestamp: z.number(),
  period: z.number().int().min(1),
});

export const TimeoutEventSchema = z.object({
  type: z.literal("timeout"),
  timestamp: z.number(),
});

export const UndoEventSchema = z.object({
  type: z.literal("undo"),
  timestamp: z.number(),
  undoneEventIndex: z.number().int().min(0),
});

export const MatchEventSchema = z.discriminatedUnion("type", [
  SubstitutionEventSchema,
  GoalEventSchema,
  OpponentGoalEventSchema,
  PenaltyEventSchema,
  PenaltyEndEventSchema,
  YellowCardEventSchema,
  RedCardEventSchema,
  InjuryEventSchema,
  InjuryRecoveryEventSchema,
  PeriodStartEventSchema,
  PeriodEndEventSchema,
  TimeoutEventSchema,
  UndoEventSchema,
]);

export type MatchEvent = z.infer<typeof MatchEventSchema>;
export type SubstitutionEvent = z.infer<typeof SubstitutionEventSchema>;
export type GoalEvent = z.infer<typeof GoalEventSchema>;
export type OpponentGoalEvent = z.infer<typeof OpponentGoalEventSchema>;
export type PenaltyEvent = z.infer<typeof PenaltyEventSchema>;
export type PenaltyEndEvent = z.infer<typeof PenaltyEndEventSchema>;
export type YellowCardEvent = z.infer<typeof YellowCardEventSchema>;
export type RedCardEvent = z.infer<typeof RedCardEventSchema>;
export type InjuryEvent = z.infer<typeof InjuryEventSchema>;
export type InjuryRecoveryEvent = z.infer<typeof InjuryRecoveryEventSchema>;
export type PeriodStartEvent = z.infer<typeof PeriodStartEventSchema>;
export type PeriodEndEvent = z.infer<typeof PeriodEndEventSchema>;
export type TimeoutEvent = z.infer<typeof TimeoutEventSchema>;
export type UndoEvent = z.infer<typeof UndoEventSchema>;
