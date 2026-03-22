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

export type SchedulePlayerInput = {
  playerId: string;
  status: "field" | "bench";
  isKeeper: boolean;
  totalPlayTimeSeconds: number;
  groupId?: string; // Position group ID (undefined = wildcard, can sub for anyone)
};

export type ScheduleInput = {
  roster: SchedulePlayerInput[];
  totalMatchSeconds: number;
  currentTimeSeconds: number;
  playersOnField: number;
  hasKeeper: boolean;
  usePositionAwareSubstitutions?: boolean; // If true, prefer same-group substitutions
};
