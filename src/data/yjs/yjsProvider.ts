import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

let doc: Y.Doc | null = null;
let persistence: IndexeddbPersistence | null = null;

export function getYjsDoc(): Y.Doc {
  if (!doc) {
    doc = new Y.Doc();
    persistence = new IndexeddbPersistence("subcoach-data", doc);
  }
  return doc;
}

export function getYjsPersistence(): IndexeddbPersistence | null {
  return persistence;
}

export function destroyYjs(): void {
  if (persistence) {
    persistence.destroy();
    persistence = null;
  }
  if (doc) {
    doc.destroy();
    doc = null;
  }
}
