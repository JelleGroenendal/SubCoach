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
    positionGroups: [
      { id: "goalie", name: "sport.water-polo.group.goalie" },
      { id: "defense", name: "sport.water-polo.group.defense" },
      { id: "attack", name: "sport.water-polo.group.attack" },
    ],
    positions: [
      {
        id: "goalie",
        name: "sport.water-polo.position.goalie",
        abbreviation: "sport.water-polo.position.goalieAbbr",
        isKeeper: true,
        groupId: "goalie",
      },
      {
        id: "defender",
        name: "sport.water-polo.position.defender",
        abbreviation: "sport.water-polo.position.defenderAbbr",
        groupId: "defense",
      },
      {
        id: "wing",
        name: "sport.water-polo.position.wing",
        abbreviation: "sport.water-polo.position.wingAbbr",
        groupId: "attack",
      },
      {
        id: "center",
        name: "sport.water-polo.position.center",
        abbreviation: "sport.water-polo.position.centerAbbr",
        groupId: "attack",
      },
      {
        id: "point",
        name: "sport.water-polo.position.point",
        abbreviation: "sport.water-polo.position.pointAbbr",
        groupId: "attack",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
    injuryAllowsReplacement: true,
    intervalPresetsMinutes: [2, 4, 5, 8],
    defaultIntervalMinutes: 4,
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
