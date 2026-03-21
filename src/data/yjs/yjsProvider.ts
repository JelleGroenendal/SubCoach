import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

// App-level doc (team refs, settings)
let appDoc: Y.Doc | null = null;
let appPersistence: IndexeddbPersistence | null = null;
let appSynced = false;

// Team docs, one per team
const teamDocs = new Map<
  string,
  { doc: Y.Doc; persistence: IndexeddbPersistence; synced: boolean }
>();

// Callbacks for when docs are synced
const syncCallbacks = new Map<string, Array<() => void>>();

export function getAppDoc(): Y.Doc {
  if (!appDoc) {
    appDoc = new Y.Doc();
    appPersistence = new IndexeddbPersistence("subcoach-app", appDoc);
    appPersistence.once("synced", () => {
      appSynced = true;
      const cbs = syncCallbacks.get("app");
      if (cbs) {
        cbs.forEach((cb) => cb());
        syncCallbacks.delete("app");
      }
    });
  }
  return appDoc;
}

export function isAppSynced(): boolean {
  return appSynced;
}

export function waitForAppSync(): Promise<void> {
  if (appSynced) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const cbs = syncCallbacks.get("app") ?? [];
    cbs.push(resolve);
    syncCallbacks.set("app", cbs);
    getAppDoc(); // ensure doc is created
  });
}

export function getTeamDoc(teamId: string): Y.Doc {
  const existing = teamDocs.get(teamId);
  if (existing) return existing.doc;

  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`subcoach-team-${teamId}`, doc);
  const entry = { doc, persistence, synced: false };

  persistence.once("synced", () => {
    entry.synced = true;
    const cbs = syncCallbacks.get(teamId);
    if (cbs) {
      cbs.forEach((cb) => cb());
      syncCallbacks.delete(teamId);
    }
  });

  teamDocs.set(teamId, entry);
  return doc;
}

export function isTeamSynced(teamId: string): boolean {
  return teamDocs.get(teamId)?.synced ?? false;
}

export function waitForTeamSync(teamId: string): Promise<void> {
  const entry = teamDocs.get(teamId);
  if (entry?.synced) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const cbs = syncCallbacks.get(teamId) ?? [];
    cbs.push(resolve);
    syncCallbacks.set(teamId, cbs);
    getTeamDoc(teamId); // ensure doc is created
  });
}

export function destroyTeamDoc(teamId: string): void {
  const entry = teamDocs.get(teamId);
  if (entry) {
    entry.persistence.destroy();
    entry.doc.destroy();
    teamDocs.delete(teamId);
  }
  // Also delete the IndexedDB database
  if (typeof indexedDB !== "undefined") {
    indexedDB.deleteDatabase(`subcoach-team-${teamId}`);
  }
}

export function destroyAll(): void {
  // Destroy all team docs
  for (const [teamId] of teamDocs) {
    destroyTeamDoc(teamId);
  }
  // Destroy app doc
  if (appPersistence) {
    appPersistence.destroy();
    appPersistence = null;
  }
  if (appDoc) {
    appDoc.destroy();
    appDoc = null;
  }
  appSynced = false;
  if (typeof indexedDB !== "undefined") {
    indexedDB.deleteDatabase("subcoach-app");
  }
}

export function getActiveTeamDocs(): Map<string, Y.Doc> {
  const result = new Map<string, Y.Doc>();
  for (const [id, entry] of teamDocs) {
    result.set(id, entry.doc);
  }
  return result;
}
