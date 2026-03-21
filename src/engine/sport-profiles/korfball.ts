import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Korfball profile.
 *
 * No time penalties. Red card results in permanent removal.
 */
export const korfballProfile: SportProfile = {
  id: "korfball",
  name: "sport.korfball.name",

  match: {
    defaultPeriodCount: 4, // quarters
    defaultPeriodDurationMinutes: 10,
    hasTimeout: false,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 8,
    hasKeeper: false,
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
  },

  penalties: {
    timePenalties: [],
    cards: ["yellow", "red"],
    secondYellowIsRed: false,
    redCardPermanent: true,
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
