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
    positions: [
      {
        id: "keeper",
        name: "sport.handball.position.keeper",
        abbreviation: "sport.handball.position.keeperAbbr",
        isKeeper: true,
        groupId: "keeper",
      },
      {
        id: "leftwing",
        name: "sport.handball.position.leftWing",
        abbreviation: "sport.handball.position.leftWingAbbr",
        groupId: "attack",
      },
      {
        id: "leftback",
        name: "sport.handball.position.leftBack",
        abbreviation: "sport.handball.position.leftBackAbbr",
        groupId: "defense",
      },
      {
        id: "center",
        name: "sport.handball.position.center",
        abbreviation: "sport.handball.position.centerAbbr",
        groupId: "defense",
      },
      {
        id: "rightback",
        name: "sport.handball.position.rightBack",
        abbreviation: "sport.handball.position.rightBackAbbr",
        groupId: "defense",
      },
      {
        id: "rightwing",
        name: "sport.handball.position.rightWing",
        abbreviation: "sport.handball.position.rightWingAbbr",
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
