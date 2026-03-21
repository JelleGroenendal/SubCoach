import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Football (soccer) profile — youth defaults (KNVB D-jeugd: 9v9, 2x25min).
 *
 * Youth (KNVB E-B): unlimited rolling subs with re-entry.
 * Senior rules are more restrictive (11v11, 2x45min, maxSubstitutions: 5,
 * substitutionWindows: 3, canSubBack: false) — coaches can override.
 */
export const footballProfile: SportProfile = {
  id: "football",
  name: "sport.football.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 25, // D-jeugd (senior = 45)
    hasTimeout: false,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 9, // D-jeugd (senior = 11)
    hasKeeper: true,
  },

  substitutions: {
    unlimited: true, // youth KNVB
    flying: true, // youth KNVB rolling subs
    canSubBack: true, // youth KNVB re-entry allowed
  },

  penalties: {
    timePenalties: [],
    cards: ["yellow", "red"],
    secondYellowIsRed: true,
    redCardPermanent: true, // team permanently plays with fewer
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
