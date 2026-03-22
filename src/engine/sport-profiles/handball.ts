import type { SportProfile } from "@/data/schemas/sportProfile";

export const handballProfile: SportProfile = {
  id: "handball",
  name: "sport.handball.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 25, // youth default (senior = 30)
    hasTimeout: true,
    stoppedClock: false,
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
        name: "2min",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
    ],
    maxTimePenalties: 3,
    // Handball: yellow card is WARNING ONLY (no game impact), not tracked
    // Red card = direct disqualification (can be given after 3x 2-min penalties)
    cards: ["red"],
    secondYellowIsRed: false,
    redCardPermanent: false, // team plays -1 for 2 min, then can fill spot
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
