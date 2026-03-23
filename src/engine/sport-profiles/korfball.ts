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
    positionGroups: [
      { id: "attack", name: "sport.korfball.group.attack" },
      { id: "defense", name: "sport.korfball.group.defense" },
    ],
    positions: [
      {
        id: "attack",
        name: "sport.korfball.position.attack",
        abbreviation: "sport.korfball.position.attackAbbr",
        groupId: "attack",
      },
      {
        id: "defense",
        name: "sport.korfball.position.defense",
        abbreviation: "sport.korfball.position.defenseAbbr",
        groupId: "defense",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
    injuryAllowsReplacement: true,
    intervalPresetsMinutes: [3, 5, 7, 10, 15],
    defaultIntervalMinutes: 7,
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
