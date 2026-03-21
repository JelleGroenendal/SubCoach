import { getYjsDoc } from "./yjsProvider";
import type { Match } from "../schemas";

const MATCH_KEY = "currentMatch";
const HISTORY_KEY = "matchHistory";

export function getCurrentMatchFromYjs(): Match | undefined {
  const doc = getYjsDoc();
  const ymap = doc.getMap(MATCH_KEY);
  const data = ymap.get("data");
  return data as Match | undefined;
}

export function saveCurrentMatchToYjs(match: Match): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(MATCH_KEY);
  doc.transact(() => {
    ymap.set("data", structuredClone(match));
  });
}

export function clearCurrentMatch(): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(MATCH_KEY);
  doc.transact(() => {
    ymap.delete("data");
  });
}

export function getMatchHistoryFromYjs(): Match[] {
  const doc = getYjsDoc();
  const ymap = doc.getMap(HISTORY_KEY);
  const data = ymap.get("matches");
  if (Array.isArray(data)) return data as Match[];
  return [];
}

export function saveMatchToHistory(match: Match): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(HISTORY_KEY);
  const history = getMatchHistoryFromYjs();
  doc.transact(() => {
    ymap.set("matches", [match, ...history]);
  });
}

export function deleteMatchFromHistory(matchId: string): void {
  const doc = getYjsDoc();
  const ymap = doc.getMap(HISTORY_KEY);
  const history = getMatchHistoryFromYjs();
  doc.transact(() => {
    ymap.set(
      "matches",
      history.filter((m) => m.id !== matchId),
    );
  });
}
