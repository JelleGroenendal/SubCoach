import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Floorball (unihockey) profile.
 *
 * Uses verbal warnings and time penalties instead of cards.
 */
export const floorballProfile: SportProfile = {
  id: "floorball",
  name: "sport.floorball.name",

  match: {
    defaultPeriodCount: 3,
    defaultPeriodDurationMinutes: 20,
    hasTimeout: true,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 6,
    hasKeeper: true,
    positionGroups: [
      { id: "keeper", name: "sport.floorball.group.keeper" },
      { id: "defense", name: "sport.floorball.group.defense" },
      { id: "attack", name: "sport.floorball.group.attack" },
    ],
    positions: [
      {
        id: "keeper",
        name: "sport.floorball.position.keeper",
        abbreviation: "sport.floorball.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "defender",
        name: "sport.floorball.position.defender",
        abbreviation: "sport.floorball.position.defenderAbbr",
        groupId: "defense",
      },
      {
        id: "forward",
        name: "sport.floorball.position.forward",
        abbreviation: "sport.floorball.position.forwardAbbr",
        groupId: "attack",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
    injuryAllowsReplacement: true,
  },

  penalties: {
    timePenalties: [
      {
        name: "2min",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
      {
        name: "5min",
        durationSeconds: 300,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
      {
        name: "10min",
        durationSeconds: 600,
        teamPlaysShort: false, // Player sits out, but team can substitute
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
