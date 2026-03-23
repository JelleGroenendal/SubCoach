import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Field hockey profile.
 *
 * Uses a three-card system: green (2 min), yellow (5 min), red (permanent).
 */
export const fieldHockeyProfile: SportProfile = {
  id: "field-hockey",
  name: "sport.field-hockey.name",

  match: {
    defaultPeriodCount: 4, // quarters
    defaultPeriodDurationMinutes: 15,
    hasTimeout: false,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 11,
    hasKeeper: true,
    positionGroups: [
      { id: "keeper", name: "sport.field-hockey.group.keeper" },
      { id: "defense", name: "sport.field-hockey.group.defense" },
      { id: "midfield", name: "sport.field-hockey.group.midfield" },
      { id: "attack", name: "sport.field-hockey.group.attack" },
    ],
    positions: [
      {
        id: "keeper",
        name: "sport.field-hockey.position.keeper",
        abbreviation: "sport.field-hockey.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "defender",
        name: "sport.field-hockey.position.defender",
        abbreviation: "sport.field-hockey.position.defenderAbbr",
        groupId: "defense",
      },
      {
        id: "midfielder",
        name: "sport.field-hockey.position.midfielder",
        abbreviation: "sport.field-hockey.position.midfielderAbbr",
        groupId: "midfield",
      },
      {
        id: "forward",
        name: "sport.field-hockey.position.forward",
        abbreviation: "sport.field-hockey.position.forwardAbbr",
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
        name: "green",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
      {
        name: "yellow",
        durationSeconds: 300,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
    ],
    cards: ["green", "yellow", "red"],
    secondYellowIsRed: false,
    redCardPermanent: true,
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
