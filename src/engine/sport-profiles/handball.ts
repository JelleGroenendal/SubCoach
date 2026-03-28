import type { SportProfile } from "@/data/schemas/sportProfile";

export const handballProfile: SportProfile = {
  id: "handball",
  name: "sport.handball.name",

  match: {
    defaultPeriodCount: 2,
    defaultPeriodDurationMinutes: 25, // youth default (senior = 30)
    hasTimeout: true,
    stoppedClock: false,
  },

  players: {
    defaultPlayersOnField: 7,
    hasKeeper: true,
    positionGroups: [
      { id: "keeper", name: "sport.handball.group.keeper" },
      { id: "defense", name: "sport.handball.group.defense" },
      { id: "attack", name: "sport.handball.group.attack" },
    ],
    // Position order: back to front (keeper -> center -> backs -> corners -> pivot)
    // Visual order on field: keeper at top, then MO, then LO/RO, then LH/RH, pivot at bottom
    positions: [
      {
        id: "keeper",
        name: "sport.handball.position.keeper",
        abbreviation: "sport.handball.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "center",
        name: "sport.handball.position.center",
        abbreviation: "sport.handball.position.centerAbbr",
        groupId: "attack",
      },
      {
        id: "leftback",
        name: "sport.handball.position.leftBack",
        abbreviation: "sport.handball.position.leftBackAbbr",
        groupId: "attack",
      },
      {
        id: "rightback",
        name: "sport.handball.position.rightBack",
        abbreviation: "sport.handball.position.rightBackAbbr",
        groupId: "attack",
      },
      {
        id: "leftcorner",
        name: "sport.handball.position.leftCorner",
        abbreviation: "sport.handball.position.leftCornerAbbr",
        groupId: "attack",
      },
      {
        id: "rightcorner",
        name: "sport.handball.position.rightCorner",
        abbreviation: "sport.handball.position.rightCornerAbbr",
        groupId: "attack",
      },
      {
        id: "pivot",
        name: "sport.handball.position.pivot",
        abbreviation: "sport.handball.position.pivotAbbr",
        groupId: "attack",
      },
    ],
  },

  substitutions: {
    unlimited: true,
    flying: true,
    canSubBack: true,
    injuryAllowsReplacement: true, // Injured player can be immediately replaced
    intervalPresetsMinutes: [2, 3, 5, 7, 10, 15],
    defaultIntervalMinutes: 5,
  },

  penalties: {
    timePenalties: [
      {
        name: "2min",
        durationSeconds: 120,
        teamPlaysShort: true,
        endsOnGoal: false,
      },
    ],
    maxTimePenalties: 3,
    // Handball: yellow card is WARNING ONLY (no game impact), not tracked
    // Red card = direct disqualification (can be given after 3x 2-min penalties)
    cards: ["red"],
    secondYellowIsRed: false,
    redCardPermanent: false, // team plays -1 for 2 min, then can fill spot
    personalFoulLimit: undefined,
  },

  scoring: {
    type: "goals",
    values: [{ name: "goal", value: 1 }],
  },
};
