import { getYjsDoc } from "./yjsProvider";
import type { Team } from "../schemas";

const TEAM_KEY = "team";

export function getTeamFromYjs(): Team | undefined {
  const doc = getYjsDoc();
  const ymap = doc.getMap(TEAM_KEY);
  const data = ymap.get("data");
  return data as Team | undefined;
}

export function saveTeamToYjs(team: Team): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(TEAM_KEY);
  doc.transact(() => {
    ymap.set("data", structuredClone(team));
  });
}

export function deleteTeamFromYjs(): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(TEAM_KEY);
  doc.transact(() => {
    ymap.delete("data");
  });
}
