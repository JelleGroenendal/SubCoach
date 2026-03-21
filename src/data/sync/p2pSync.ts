import { joinRoom, type Room } from "trystero";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// Generate a short, shareable room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Normalize room code (uppercase, trim)
export function normalizeRoomCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

interface P2PSyncState {
  room: Room | null;
  roomCode: string | null;
  peerCount: number;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

type P2PSyncListener = (state: P2PSyncState) => void;

// P2P Sync Manager - manages WebRTC connections for syncing Yjs docs
class P2PSyncManager {
  private room: Room | null = null;
  private roomCode: string | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  // Store reference to doc for potential cleanup/reconnection
  private connectedDoc: Y.Doc | null = null;
  private peerCount = 0;
  private isConnecting = false;
  private isConnected = false;
  private error: string | null = null;
  private listeners: Set<P2PSyncListener> = new Set();
  private sendSync: ((data: Uint8Array, peerId?: string) => void) | null = null;
  private sendAwareness: ((data: Uint8Array) => void) | null = null;

  // Get current state
  getState(): P2PSyncState {
    return {
      room: this.room,
      roomCode: this.roomCode,
      peerCount: this.peerCount,
      isConnecting: this.isConnecting,
      isConnected: this.isConnected,
      error: this.error,
    };
  }

  // Get the currently connected doc (for debugging/status)
  getConnectedDoc(): Y.Doc | null {
    return this.connectedDoc;
  }

  // Subscribe to state changes
  subscribe(listener: P2PSyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Start hosting a sync room
  async hostRoom(doc: Y.Doc): Promise<string> {
    if (this.room) {
      this.disconnect();
    }

    const roomCode = generateRoomCode();
    await this.joinRoomInternal(roomCode, doc);
    return roomCode;
  }

  // Join an existing sync room
  async joinRoom(roomCode: string, doc: Y.Doc): Promise<void> {
    if (this.room) {
      this.disconnect();
    }

    const normalizedCode = normalizeRoomCode(roomCode);
    if (normalizedCode.length !== 6) {
      throw new Error("Invalid room code");
    }

    await this.joinRoomInternal(normalizedCode, doc);
  }

  private async joinRoomInternal(roomCode: string, doc: Y.Doc): Promise<void> {
    this.isConnecting = true;
    this.error = null;
    this.roomCode = roomCode;
    this.connectedDoc = doc;
    this.notifyListeners();

    try {
      // Join room using BitTorrent trackers (no server needed)
      // The room ID includes "subcoach" prefix to avoid collisions
      this.room = joinRoom({ appId: "subcoach" }, `subcoach-${roomCode}`);

      // Setup awareness for cursor/presence
      this.awareness = new awarenessProtocol.Awareness(doc);

      // Setup sync and awareness channels
      const [sendSync, getSync] = this.room.makeAction<Uint8Array>("sync");
      const [sendAwareness, getAwareness] =
        this.room.makeAction<Uint8Array>("awareness");

      this.sendSync = sendSync;
      this.sendAwareness = sendAwareness;

      // Handle incoming sync messages
      getSync((data, peerId) => {
        try {
          const decoder = decoding.createDecoder(data);
          const encoder = encoding.createEncoder();
          const messageType = syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            null,
          );
          if (messageType !== 0 && encoding.length(encoder) > 0) {
            sendSync(encoding.toUint8Array(encoder), peerId);
          }
        } catch (e) {
          console.error("Sync error:", e);
        }
      });

      // Handle incoming awareness messages
      getAwareness((data) => {
        try {
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness!,
            data,
            "remote",
          );
        } catch (e) {
          console.error("Awareness error:", e);
        }
      });

      // Handle peer join
      this.room.onPeerJoin((peerId) => {
        this.peerCount++;
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyListeners();

        // Send initial sync state to new peer
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(encoder, doc);
        sendSync(encoding.toUint8Array(encoder), peerId);

        // Send awareness state
        sendAwareness(
          awarenessProtocol.encodeAwarenessUpdate(this.awareness!, [
            doc.clientID,
          ]),
        );
      });

      // Handle peer leave
      this.room.onPeerLeave(() => {
        this.peerCount = Math.max(0, this.peerCount - 1);
        this.isConnected = this.peerCount > 0;
        this.notifyListeners();
      });

      // Listen for local doc changes and broadcast
      doc.on("update", (update: Uint8Array, origin: unknown) => {
        if (origin !== "remote" && this.sendSync) {
          const encoder = encoding.createEncoder();
          syncProtocol.writeUpdate(encoder, update);
          this.sendSync(encoding.toUint8Array(encoder));
        }
      });

      // Listen for awareness changes and broadcast
      this.awareness.on(
        "update",
        ({ added, updated }: { added: number[]; updated: number[] }) => {
          const changedClients = added.concat(updated);
          if (this.sendAwareness && changedClients.length > 0) {
            this.sendAwareness(
              awarenessProtocol.encodeAwarenessUpdate(
                this.awareness!,
                changedClients,
              ),
            );
          }
        },
      );

      this.isConnecting = false;
      this.notifyListeners();
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Connection failed";
      this.isConnecting = false;
      this.isConnected = false;
      this.notifyListeners();
      throw e;
    }
  }

  // Disconnect from the room
  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }
    this.connectedDoc = null;
    this.roomCode = null;
    this.peerCount = 0;
    this.isConnecting = false;
    this.isConnected = false;
    this.error = null;
    this.sendSync = null;
    this.sendAwareness = null;
    this.notifyListeners();
  }
}

// Singleton instance
export const p2pSync = new P2PSyncManager();
