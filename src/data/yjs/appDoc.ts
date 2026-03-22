import { getAppDoc } from "@/data/yjs/yjsProvider";
import type { TeamRef } from "@/data/schemas";

// Current schema version - increment when data structure changes
export const SCHEMA_VERSION = 1;

/**
 * Initialize the app doc with schema version if not already set.
 * Call this on app startup after Yjs syncs with IndexedDB.
 */
export function initializeAppDoc(): void {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");

  if (!meta.has("schemaVersion")) {
    doc.transact(() => {
      meta.set("schemaVersion", SCHEMA_VERSION);
      meta.set("schemaUpdatedAt", Date.now());
    });
  }
}

/**
 * Get the current schema version from the app doc.
 */
export function getSchemaVersion(): number {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  return (meta.get("schemaVersion") as number) ?? 0;
}

export function getTeamRefs(): TeamRef[] {
  const doc = getAppDoc();
  const arr = doc.getArray<TeamRef>("teamRefs");
  return arr.toArray();
}

export function addTeamRef(ref: TeamRef): void {
  const doc = getAppDoc();
  const arr = doc.getArray<TeamRef>("teamRefs");
  doc.transact(() => {
    arr.push([ref]);
  });
}

export function updateTeamRef(
  teamId: string,
  updates: Partial<Pick<TeamRef, "name" | "sportProfileId">>,
): void {
  const doc = getAppDoc();
  const arr = doc.getArray<TeamRef>("teamRefs");
  doc.transact(() => {
    for (let i = 0; i < arr.length; i++) {
      const item = arr.get(i);
      if (item.id === teamId) {
        arr.delete(i, 1);
        arr.insert(i, [{ ...item, ...updates }]);
        break;
      }
    }
  });
}

export function removeTeamRef(teamId: string): void {
  const doc = getAppDoc();
  const arr = doc.getArray<TeamRef>("teamRefs");
  doc.transact(() => {
    for (let i = 0; i < arr.length; i++) {
      if (arr.get(i).id === teamId) {
        arr.delete(i, 1);
        break;
      }
    }
  });
}

export function getActiveTeamId(): string | undefined {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  return meta.get("activeTeamId") as string | undefined;
}

export function setActiveTeamId(teamId: string): void {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  doc.transact(() => {
    meta.set("activeTeamId", teamId);
  });
}

export function clearActiveTeamId(): void {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  doc.transact(() => {
    meta.delete("activeTeamId");
  });
}

export function getAppSetting(key: string): unknown {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  return meta.get(key);
}

export function setAppSetting(key: string, value: unknown): void {
  const doc = getAppDoc();
  const meta = doc.getMap("meta");
  doc.transact(() => {
    meta.set(key, value);
  });
}
