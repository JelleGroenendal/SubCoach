import { z } from "zod";

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  number: z.number().int().min(1).max(99).optional(),
  /** @deprecated Use positionIds instead */
  positionId: z.string().optional(),
  /** Multiple positions a player can play (e.g., left wing AND right wing) */
  positionIds: z.array(z.string()).optional(),
  active: z.boolean(),
});

export type Player = z.infer<typeof PlayerSchema>;
