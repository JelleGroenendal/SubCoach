export type SubstitutionSuggestion = {
  timestamp: number;
  playerInId: string;
  playerOutId: string;
  reason: "scheduled" | "fairness" | "penaltyReturn" | "fixedInterval";
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

// Substitution mode: "equal" distributes play time equally, "fixed" uses fixed intervals
export type SubstitutionMode = "equal" | "fixed";

export type ScheduleInput = {
  roster: SchedulePlayerInput[];
  totalMatchSeconds: number;
  currentTimeSeconds: number;
  playersOnField: number;
  hasKeeper: boolean;
  usePositionAwareSubstitutions?: boolean; // If true, prefer same-group substitutions
  // New fields for substitution mode
  substitutionMode?: SubstitutionMode; // default: "equal"
  fixedIntervalSeconds?: number; // Used when mode is "fixed" (e.g., 300 for 5 minutes)
  lastSubstitutionTimeSeconds?: number; // Time of last substitution (for fixed interval calc)
};
