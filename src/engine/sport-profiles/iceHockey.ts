import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Ice hockey profile.
 *
 * Minor penalties end on goal (power play ends), major penalties do not.
 */
export const iceHockeyProfile: SportProfile = {
  id: "ice-hockey",
  name: "sport.ice-hockey.name",

  match: {
    defaultPeriodCount: 3,
    defaultPeriodDurationMinutes: 20,
    hasTimeout: true,
    stoppedClock: true,
  },

  players: {
    defaultPlayersOnField: 6,
    hasKeeper: true,
  },

  substitutions: {
    unlimited: true,
    flying: true, // line changes
    canSubBack: true,
  },

  penalties: {
    timePenalties: [
      {
        name: "minor",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: true,
      },
      {
        name: "major",
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
