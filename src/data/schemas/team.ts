import { z } from "zod";

export const TeamSettingsSchema = z.object({
  periodDurationMinutes: z.number().int().min(5).max(45),
  periodCount: z.number().int().min(1).max(4),
  playersOnField: z.number().int().min(4).max(11),
});

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  clubName: z.string().max(100).optional(),
  sportProfileId: z.string().min(1),
  settings: TeamSettingsSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const TeamRefSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  sportProfileId: z.string().min(1),
  createdAt: z.number(),
});

export type TeamSettings = z.infer<typeof TeamSettingsSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeamRef = z.infer<typeof TeamRefSchema>;
