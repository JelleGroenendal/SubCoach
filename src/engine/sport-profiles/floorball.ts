import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Floorball (unihockey) profile.
 *
 * Uses verbal warnings and time penalties instead of cards.
 */
export const floorballProfile: SportProfile = {
  id: "floorball",
  name: "sport.floorball.name",

  match: {
    defaultPeriodCount: 3,
    defaultPeriodDurationMinutes: 20,
    hasTimeout: true,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 6,
    hasKeeper: true,
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
  },

  penalties: {
    timePenalties: [
      {
        name: "2min",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
      {
        name: "5min",
        durationSeconds: 300,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
    ],
    cards: [],
    secondYellowIsRed: false,
    redCardPermanent: false,
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
