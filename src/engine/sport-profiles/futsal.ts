import type { SportProfile } from "@/data/schemas/sportProfile";

/**
 * Futsal profile.
 *
 * Official rules use a stopped clock, but youth leagues often use a running
 * clock. Default is false (running) since target users are youth coaches.
 */
export const futsalProfile: SportProfile = {
  id: "futsal",
  name: "sport.futsal.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 20,
    hasTimeout: true,
    stoppedClock: false, // official = true, youth often running
  },

  players: {
    defaultPlayersOnField: 5,
    hasKeeper: true,
    positionGroups: [
      { id: "keeper", name: "sport.futsal.group.keeper" },
      { id: "defense", name: "sport.futsal.group.defense" },
      { id: "attack", name: "sport.futsal.group.attack" },
    ],
    positions: [
      {
        id: "keeper",
        name: "sport.futsal.position.keeper",
        abbreviation: "sport.futsal.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "defender",
        name: "sport.futsal.position.defender",
        abbreviation: "sport.futsal.position.defenderAbbr",
        groupId: "defense",
      },
      {
        id: "winger",
        name: "sport.futsal.position.winger",
        abbreviation: "sport.futsal.position.wingerAbbr",
        groupId: "attack",
      },
      {
        id: "pivot",
        name: "sport.futsal.position.pivot",
        abbreviation: "sport.futsal.position.pivotAbbr",
        groupId: "attack",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
    injuryAllowsReplacement: true,
    intervalPresetsMinutes: [2, 3, 5, 7, 10],
    defaultIntervalMinutes: 5,
  },

  penalties: {
    timePenalties: [
      {
        name: "sent-off",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: true, // team can fill spot after conceding
      },
    ],
    cards: ["yellow", "red"],
    secondYellowIsRed: true,
    redCardPermanent: false,
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
