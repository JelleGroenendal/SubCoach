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
    positions: [
      {
        id: "goalie",
        name: "sport.water-polo.position.goalie",
        abbreviation: "sport.water-polo.position.goalieAbbr",
        isKeeper: true,
      },
      {
        id: "defender",
        name: "sport.water-polo.position.defender",
        abbreviation: "sport.water-polo.position.defenderAbbr",
      },
      {
        id: "wing",
        name: "sport.water-polo.position.wing",
        abbreviation: "sport.water-polo.position.wingAbbr",
      },
      {
        id: "center",
        name: "sport.water-polo.position.center",
        abbreviation: "sport.water-polo.position.centerAbbr",
      },
      {
        id: "point",
        name: "sport.water-polo.position.point",
        abbreviation: "sport.water-polo.position.pointAbbr",
      },
    ],
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
