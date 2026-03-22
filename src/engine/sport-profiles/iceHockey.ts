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
    positions: [
      {
        id: "goalie",
        name: "sport.ice-hockey.position.goalie",
        abbreviation: "sport.ice-hockey.position.goalieAbbr",
        isKeeper: true,
      },
      {
        id: "defender",
        name: "sport.ice-hockey.position.defender",
        abbreviation: "sport.ice-hockey.position.defenderAbbr",
      },
      {
        id: "center",
        name: "sport.ice-hockey.position.center",
        abbreviation: "sport.ice-hockey.position.centerAbbr",
      },
      {
        id: "winger",
        name: "sport.ice-hockey.position.winger",
        abbreviation: "sport.ice-hockey.position.wingerAbbr",
      },
    ],
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
