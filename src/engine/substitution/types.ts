export type SubstitutionSuggestion = {
  timestamp: number;
  playerInId: string;
  playerOutId: string;
  reason: "scheduled" | "fairness" | "penaltyReturn";
};

export type SubstitutionPlan = {
  suggestions: SubstitutionSuggestion[];
  warnings: string[];
};

export type ScheduleInput = {
  roster: Array<{
    playerId: string;
    status: "field" | "bench";
    isKeeper: boolean;
    totalPlayTimeSeconds: number;
  }>;
  totalMatchSeconds: number;
  currentTimeSeconds: number;
  playersOnField: number;
  hasKeeper: boolean;
};
