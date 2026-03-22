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
    positionGroups: [
      { id: "keeper", name: "sport.football.group.keeper" },
      { id: "defense", name: "sport.football.group.defense" },
      { id: "midfield", name: "sport.football.group.midfield" },
      { id: "attack", name: "sport.football.group.attack" },
    ],
    positions: [
      {
        id: "keeper",
        name: "sport.football.position.keeper",
        abbreviation: "sport.football.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "defender",
        name: "sport.football.position.defender",
        abbreviation: "sport.football.position.defenderAbbr",
        groupId: "defense",
      },
      {
        id: "midfielder",
        name: "sport.football.position.midfielder",
        abbreviation: "sport.football.position.midfielderAbbr",
        groupId: "midfield",
      },
      {
        id: "forward",
        name: "sport.football.position.forward",
        abbreviation: "sport.football.position.forwardAbbr",
        groupId: "attack",
      },
    ],
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
