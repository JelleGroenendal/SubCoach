import type { SportProfile } from "@/data/schemas/sportProfile";

export const handballProfile: SportProfile = {
  id: "handball",
  name: "sport.handball.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 25,
    hasTimeout: true,
  },

  players: {
    defaultPlayersOnField: 7,
    hasKeeper: true,
  },

  substitutions: {
    unlimited: true,
    flying: true,
    maxSubstitutions: undefined,
    canSubBack: true,
  },

  penalties: {
    timePenalties: [
      {
        name: "2min",
        durationSeconds: 120,
        teamPlaysShort: true,
      },
    ],
    maxTimePenalties: 3,
    cards: ["yellow", "red"],
    personalFoulLimit: undefined,
    penaltyEndsOnGoal: false,
  },

  scoring: {
    type: "goals",
    values: [1],
  },
};
