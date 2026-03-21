import type { SportProfile } from "@/data/schemas/sportProfile";
import { handballProfile } from "./handball";

const profiles: Record<string, SportProfile> = {
  handball: handballProfile,
};

export function getSportProfile(id: string): SportProfile | undefined {
  return profiles[id];
}

export function getAllSportProfiles(): SportProfile[] {
  return Object.values(profiles);
}

export function getSportProfileOrThrow(id: string): SportProfile {
  const profile = profiles[id];
  if (!profile) {
    throw new Error(`Sport profile "${id}" not found`);
  }
  return profile;
}
