import { useEffect, useState, useCallback } from "react";
import { p2pSync, generateRoomCode, normalizeRoomCode } from "./p2pSync";
import type * as Y from "yjs";

interface P2PSyncHookState {
  roomCode: string | null;
  peerCount: number;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

interface P2PSyncHook extends P2PSyncHookState {
  hostRoom: (doc: Y.Doc) => Promise<string>;
  joinRoom: (code: string, doc: Y.Doc) => Promise<void>;
  disconnect: () => void;
}

export function useP2PSync(): P2PSyncHook {
  const [state, setState] = useState<P2PSyncHookState>(() => {
    const s = p2pSync.getState();
    return {
      roomCode: s.roomCode,
      peerCount: s.peerCount,
      isConnecting: s.isConnecting,
      isConnected: s.isConnected,
      error: s.error,
    };
  });

  useEffect(() => {
    return p2pSync.subscribe((newState) => {
      setState({
        roomCode: newState.roomCode,
        peerCount: newState.peerCount,
        isConnecting: newState.isConnecting,
        isConnected: newState.isConnected,
        error: newState.error,
      });
    });
  }, []);

  const hostRoom = useCallback(async (doc: Y.Doc): Promise<string> => {
    return p2pSync.hostRoom(doc);
  }, []);

  const joinRoom = useCallback(
    async (code: string, doc: Y.Doc): Promise<void> => {
      return p2pSync.joinRoom(code, doc);
    },
    [],
  );

  const disconnect = useCallback((): void => {
    p2pSync.disconnect();
  }, []);

  return {
    ...state,
    hostRoom,
    joinRoom,
    disconnect,
  };
}

export { generateRoomCode, normalizeRoomCode };
