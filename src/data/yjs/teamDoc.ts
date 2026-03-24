import { getTeamDoc } from "@/data/yjs/yjsProvider";
import {
  type Player,
  type Team,
  type Match,
  PlayerSchema,
  TeamSchema,
  MatchSchema,
} from "@/data/schemas";

// --- Team Info ---

export function getTeamInfo(teamId: string): Team | undefined {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  const id = info.get("id") as string | undefined;
  if (!id) return undefined;

  const rawTeam = {
    id: id,
    name: (info.get("name") as string) ?? "",
    clubName: info.get("clubName") as string | undefined,
    sportProfileId: (info.get("sportProfileId") as string) ?? "handball",
    settings: {
      periodDurationMinutes:
        (info.get("periodDurationMinutes") as number) ?? 25,
      periodCount: (info.get("periodCount") as number) ?? 2,
      playersOnField: (info.get("playersOnField") as number) ?? 7,
      usePositionAwareSubstitutions:
        (info.get("usePositionAwareSubstitutions") as boolean) ?? false,
      substitutionMode: info.get("substitutionMode") as
        | "equal"
        | "fixed"
        | undefined,
      fixedSubstitutionIntervalMinutes: info.get(
        "fixedSubstitutionIntervalMinutes",
      ) as number | undefined,
    },
    syncRoomCode: info.get("syncRoomCode") as string | undefined,
    createdAt: (info.get("createdAt") as number) ?? Date.now(),
    updatedAt: (info.get("updatedAt") as number) ?? Date.now(),
  };

  // Validate with Zod
  const result = TeamSchema.safeParse(rawTeam);
  if (!result.success) {
    console.error("Invalid team data in IndexedDB:", result.error);
    return undefined;
  }
  return result.data;
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
    info.set(
      "usePositionAwareSubstitutions",
      team.settings.usePositionAwareSubstitutions ?? false,
    );
    // Save substitution mode settings
    if (team.settings.substitutionMode) {
      info.set("substitutionMode", team.settings.substitutionMode);
    } else {
      info.delete("substitutionMode");
    }
    if (team.settings.fixedSubstitutionIntervalMinutes !== undefined) {
      info.set(
        "fixedSubstitutionIntervalMinutes",
        team.settings.fixedSubstitutionIntervalMinutes,
      );
    } else {
      info.delete("fixedSubstitutionIntervalMinutes");
    }
    if (team.syncRoomCode) {
      info.set("syncRoomCode", team.syncRoomCode);
    } else {
      info.delete("syncRoomCode");
    }
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
    const result = PlayerSchema.safeParse(value);
    if (result.success) {
      players.push(result.data);
    } else {
      console.error("Invalid player data in IndexedDB:", result.error);
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

export function getMatches(teamId: string): Match[] {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  const matches: Match[] = [];
  matchesMap.forEach((value) => {
    const result = MatchSchema.safeParse(value);
    if (result.success) {
      matches.push(result.data);
    } else {
      console.error("Invalid match data in IndexedDB:", result.error);
    }
  });
  return matches;
}

export function getMatch(teamId: string, matchId: string): Match | undefined {
  const doc = getTeamDoc(teamId);
  const matchesMap = doc.getMap("matches");
  const raw = matchesMap.get(matchId);
  if (!raw) return undefined;

  const result = MatchSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid match data in IndexedDB:", result.error);
    return undefined;
  }
  return result.data;
}

export function saveMatch(teamId: string, matchId: string, match: Match): void {
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

export function getCurrentMatch(teamId: string): Match | undefined {
  const doc = getTeamDoc(teamId);
  const current = doc.getMap("currentMatch");
  const raw = current.get("data");
  if (!raw) return undefined;

  const result = MatchSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid current match data in IndexedDB:", result.error);
    return undefined;
  }
  return result.data;
}

export function saveCurrentMatch(teamId: string, match: Match): void {
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

// --- Sync Room Code ---

export function getSyncRoomCode(teamId: string): string | undefined {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  return info.get("syncRoomCode") as string | undefined;
}

export function setSyncRoomCode(teamId: string, code: string): void {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  doc.transact(() => {
    info.set("syncRoomCode", code);
    info.set("updatedAt", Date.now());
  });
}

export function clearSyncRoomCode(teamId: string): void {
  const doc = getTeamDoc(teamId);
  const info = doc.getMap("info");
  doc.transact(() => {
    info.delete("syncRoomCode");
    info.set("updatedAt", Date.now());
  });
}
