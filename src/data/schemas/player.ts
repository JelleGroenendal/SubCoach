import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  number: z.number().int().min(1).max(99).optional(),
  positionId: z.string().optional(),
  active: z.boolean(),
});

export type Player = z.infer<typeof PlayerSchema>;
