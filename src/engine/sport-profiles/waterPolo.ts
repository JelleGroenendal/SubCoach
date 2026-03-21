import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Water polo profile.
 *
 * Exclusion fouls last 20 seconds and end on a goal.
 * 3rd exclusion foul results in permanent removal (substitution allowed).
 */
export const waterPoloProfile: SportProfile = {
  id: "water-polo",
  name: "sport.water-polo.name",

  match: {
    defaultPeriodCount: 4, // quarters
    defaultPeriodDurationMinutes: 8,
    hasTimeout: true,
    stoppedClock: true,
  },

  players: {
    defaultPlayersOnField: 7,
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
        name: "exclusion",
        durationSeconds: 20,
        teamPlaysShort: true,
        endsOnGoal: true,
      },
    ],
    maxTimePenalties: 3,
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
