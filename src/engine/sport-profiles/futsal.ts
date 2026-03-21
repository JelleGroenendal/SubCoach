import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Futsal profile.
 *
 * Official rules use a stopped clock, but youth leagues often use a running
 * clock. Default is false (running) since target users are youth coaches.
 */
export const futsalProfile: SportProfile = {
  id: "futsal",
  name: "sport.futsal.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 20,
    hasTimeout: true,
    stoppedClock: false, // official = true, youth often running
  },

  players: {
    defaultPlayersOnField: 5,
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
        name: "sent-off",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: true, // team can fill spot after conceding
      },
    ],
    cards: ["yellow", "red"],
    secondYellowIsRed: true,
    redCardPermanent: false,
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
