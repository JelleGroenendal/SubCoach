import { getTeamDoc } from "@/data/yjs/yjsProvider";
import type { Player, Team } from "@/data/schemas";

// --- Team Info ---

export function getTeamInfo(teamId: string): Team | undefined {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  const id = info.get("id") as string | undefined;
  if (!id) return undefined;

  return {
    id: id,
    name: (info.get("name") as string) ?? "",
    clubName: info.get("clubName") as string | undefined,
    sportProfileId: (info.get("sportProfileId") as string) ?? "handball",
    settings: {
      periodDurationMinutes:
        (info.get("periodDurationMinutes") as number) ?? 25,
      periodCount: (info.get("periodCount") as number) ?? 2,
      playersOnField: (info.get("playersOnField") as number) ?? 7,
    },
    createdAt: (info.get("createdAt") as number) ?? Date.now(),
    updatedAt: (info.get("updatedAt") as number) ?? Date.now(),
  };
}

export function saveTeamInfo(teamId: string, team: Team): void {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  doc.transact(() => {
    info.set("id", team.id);
    info.set("name", team.name);
    info.set("clubName", team.clubName);
    info.set("sportProfileId", team.sportProfileId);
    info.set("periodDurationMinutes", team.settings.periodDurationMinutes);
    info.set("periodCount", team.settings.periodCount);
    info.set("playersOnField", team.settings.playersOnField);
    info.set("createdAt", team.createdAt);
    info.set("updatedAt", team.updatedAt);
  });
}

// --- Players ---

export function getPlayers(teamId: string): Player[] {
  const doc = getTeamDoc(teamId);
  const playersMap = doc.getMap("players");
  const players: Player[] = [];
  playersMap.forEach((value) => {
    const p = value as Record<string, unknown>;
    if (p && typeof p === "object" && "id" in p) {
      players.push(p as unknown as Player);
    }
  });
  return players;
}

export function addPlayer(teamId: string, player: Player): void {
  const doc = getTeamDoc(teamId);
  const playersMap = doc.getMap("players");
  doc.transact(() => {
    playersMap.set(player.id, { ...player });
  });
}

export function updatePlayer(
  teamId: string,
  playerId: string,
  updates: Partial<Player>,
): void {
  const doc = getTeamDoc(teamId);
  const playersMap = doc.getMap("players");
  const existing = playersMap.get(playerId) as Player | undefined;
  if (!existing) return;
  doc.transact(() => {
    playersMap.set(playerId, { ...existing, ...updates });
  });
}

export function removePlayer(teamId: string, playerId: string): void {
  const doc = getTeamDoc(teamId);
  const playersMap = doc.getMap("players");
  doc.transact(() => {
    playersMap.delete(playerId);
  });
}

// --- Matches ---

export function getMatches(teamId: string): Record<string, unknown>[] {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  const matches: Record<string, unknown>[] = [];
  matchesMap.forEach((value) => {
    if (value && typeof value === "object") {
      matches.push(value as Record<string, unknown>);
    }
  });
  return matches;
}

export function getMatch(teamId: string, matchId: string): unknown {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  return matchesMap.get(matchId);
}

export function saveMatch(
  teamId: string,
  matchId: string,
  match: unknown,
): void {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  doc.transact(() => {
    matchesMap.set(matchId, match);
  });
}

export function deleteMatch(teamId: string, matchId: string): void {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  doc.transact(() => {
    matchesMap.delete(matchId);
  });
}

// --- Current Match ---

export function getCurrentMatch(teamId: string): unknown {
  const doc = getTeamDoc(teamId);
  const current = doc.getMap("currentMatch");
  return current.get("data");
}

export function saveCurrentMatch(teamId: string, match: unknown): void {
  const doc = getTeamDoc(teamId);
  const current = doc.getMap("currentMatch");
  doc.transact(() => {
    current.set("data", match);
  });
}

export function clearCurrentMatch(teamId: string): void {
  const doc = getTeamDoc(teamId);
  const current = doc.getMap("currentMatch");
  doc.transact(() => {
    current.delete("data");
  });
}
