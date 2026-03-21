import type { SportProfile } from "@/data/schemas/sportProfile";
import { handballProfile } from "./handball";
import { footballProfile } from "./football";
import { futsalProfile } from "./futsal";
import { floorballProfile } from "./floorball";
import { iceHockeyProfile } from "./iceHockey";
import { fieldHockeyProfile } from "./fieldHockey";
import { basketballProfile } from "./basketball";
import { korfballProfile } from "./korfball";
import { waterPoloProfile } from "./waterPolo";

const profiles: ReadonlyMap<string, SportProfile> = new Map([
  [handballProfile.id, handballProfile],
  [footballProfile.id, footballProfile],
  [futsalProfile.id, futsalProfile],
  [floorballProfile.id, floorballProfile],
  [iceHockeyProfile.id, iceHockeyProfile],
  [fieldHockeyProfile.id, fieldHockeyProfile],
  [basketballProfile.id, basketballProfile],
  [korfballProfile.id, korfballProfile],
  [waterPoloProfile.id, waterPoloProfile],
]);

export function getSportProfile(id: string): SportProfile | undefined {
  return profiles.get(id);
}

export function getAllSportProfiles(): SportProfile[] {
  return [...profiles.values()];
}

export function getSportProfileOrThrow(id: string): SportProfile {
  const profile = profiles.get(id);
  if (!profile) {
    throw new Error(`Sport profile "${id}" not found`);
  }
  return profile;
}
