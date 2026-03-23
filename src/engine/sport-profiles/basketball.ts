import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Basketball profile (FIBA rules).
 *
 * Substitutions are unlimited but only allowed during dead-ball situations
 * (flying: false). Uses a personal foul limit instead of cards.
 */
export const basketballProfile: SportProfile = {
  id: "basketball",
  name: "sport.basketball.name",

  match: {
    defaultPeriodCount: 4, // quarters
    defaultPeriodDurationMinutes: 10, // FIBA
    hasTimeout: true,
    stoppedClock: true,
  },

  players: {
    defaultPlayersOnField: 5,
    hasKeeper: false,
    positionGroups: [
      { id: "guard", name: "sport.basketball.group.guard" },
      { id: "forward", name: "sport.basketball.group.forward" },
      { id: "center", name: "sport.basketball.group.center" },
    ],
    positions: [
      {
        id: "pointguard",
        name: "sport.basketball.position.pointGuard",
        abbreviation: "sport.basketball.position.pointGuardAbbr",
        groupId: "guard",
      },
      {
        id: "shootingguard",
        name: "sport.basketball.position.shootingGuard",
        abbreviation: "sport.basketball.position.shootingGuardAbbr",
        groupId: "guard",
      },
      {
        id: "smallforward",
        name: "sport.basketball.position.smallForward",
        abbreviation: "sport.basketball.position.smallForwardAbbr",
        groupId: "forward",
      },
      {
        id: "powerforward",
        name: "sport.basketball.position.powerForward",
        abbreviation: "sport.basketball.position.powerForwardAbbr",
        groupId: "forward",
      },
      {
        id: "center",
        name: "sport.basketball.position.center",
        abbreviation: "sport.basketball.position.centerAbbr",
        groupId: "center",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: false, // dead ball only
    canSubBack: true,
    injuryAllowsReplacement: true,
    intervalPresetsMinutes: [2, 3, 5, 8, 10],
    defaultIntervalMinutes: 5,
  },

  penalties: {
    timePenalties: [],
    cards: [],
    secondYellowIsRed: false,
    redCardPermanent: false,
    personalFoulLimit: 5,
  },

  scoring: {
    type: "points",
    values: [
      { name: "free_throw", value: 1 },
      { name: "field_goal", value: 2 },
      { name: "three_pointer", value: 3 },
    ],
  },
};
