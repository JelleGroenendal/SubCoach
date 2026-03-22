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
    positions: [
      {
        id: "pointguard",
        name: "sport.basketball.position.pointGuard",
        abbreviation: "sport.basketball.position.pointGuardAbbr",
      },
      {
        id: "shootingguard",
        name: "sport.basketball.position.shootingGuard",
        abbreviation: "sport.basketball.position.shootingGuardAbbr",
      },
      {
        id: "smallforward",
        name: "sport.basketball.position.smallForward",
        abbreviation: "sport.basketball.position.smallForwardAbbr",
      },
      {
        id: "powerforward",
        name: "sport.basketball.position.powerForward",
        abbreviation: "sport.basketball.position.powerForwardAbbr",
      },
      {
        id: "center",
        name: "sport.basketball.position.center",
        abbreviation: "sport.basketball.position.centerAbbr",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: false, // dead ball only
    canSubBack: true,
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
