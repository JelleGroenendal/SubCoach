import { useSyncExternalStore, useCallback } from "react";
import * as Y from "yjs";
import { getYjsDoc } from "./yjsProvider";

export function useYjsMap<T>(
  mapName: string,
): [T | undefined, (value: T) => void] {
  const doc = getYjsDoc();
  const ymap = doc.getMap(mapName);

  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (): void => callback();
      ymap.observeDeep(handler);
      return () => ymap.unobserveDeep(handler);
    },
    [ymap],
  );

  const getSnapshot = useCallback((): T | undefined => {
    const data = ymap.get("data");
    return data as T | undefined;
  }, [ymap]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (newValue: T) => {
      doc.transact(() => {
        ymap.set("data", newValue as unknown as Y.Map<unknown>);
      });
    },
    [doc, ymap],
  );

  return [value, setValue];
}

export function useYjsArray<T>(
  mapName: string,
  arrayKey: string,
): [T[], (value: T[]) => void] {
  const doc = getYjsDoc();
  const ymap = doc.getMap(mapName);

  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (): void => callback();
      ymap.observeDeep(handler);
      return () => ymap.unobserveDeep(handler);
    },
    [ymap],
  );

  const getSnapshot = useCallback((): T[] => {
    const data = ymap.get(arrayKey);
    if (Array.isArray(data)) return data as T[];
    return [];
  }, [ymap, arrayKey]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (newValue: T[]) => {
      doc.transact(() => {
        ymap.set(arrayKey, newValue);
      });
    },
    [doc, ymap, arrayKey],
  );

  return [value, setValue];
}
