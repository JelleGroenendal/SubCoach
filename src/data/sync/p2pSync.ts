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

export type SyncStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface P2PSyncState {
  room: Room | null;
  roomCode: string | null;
  peerCount: number;
  status: SyncStatus;
  error: string | null;
  // Auto-reconnect state
  retryAttempt: number;
  nextRetryIn: number | null; // seconds until next retry, null if not retrying
}

// Legacy compatibility getters
export interface P2PSyncStateLegacy extends P2PSyncState {
  isConnecting: boolean;
  isConnected: boolean;
}

type P2PSyncListener = (state: P2PSyncStateLegacy) => void;
type DisconnectListener = (reason: "manual" | "peer_left" | "error") => void;

// Exponential backoff config
const RETRY_BASE_DELAY = 2000; // 2 seconds
const RETRY_MAX_DELAY = 30000; // 30 seconds
const RETRY_MAX_ATTEMPTS = 5;

// P2P Sync Manager - manages WebRTC connections for syncing Yjs docs
class P2PSyncManager {
  private room: Room | null = null;
  private roomCode: string | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private connectedDoc: Y.Doc | null = null;
  private peerCount = 0;
  private status: SyncStatus = "disconnected";
  private error: string | null = null;
  private listeners: Set<P2PSyncListener> = new Set();
  private disconnectListeners: Set<DisconnectListener> = new Set();
  private sendSync: ((data: Uint8Array, peerId?: string) => void) | null = null;
  private sendAwareness: ((data: Uint8Array) => void) | null = null;

  // Auto-reconnect state
  private retryAttempt = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private nextRetryIn: number | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private autoReconnectEnabled = false;
  private lastRoomCode: string | null = null;
  private lastDoc: Y.Doc | null = null;

  // Get current state (with legacy compatibility)
  getState(): P2PSyncStateLegacy {
    return {
      room: this.room,
      roomCode: this.roomCode,
      peerCount: this.peerCount,
      status: this.status,
      error: this.error,
      retryAttempt: this.retryAttempt,
      nextRetryIn: this.nextRetryIn,
      // Legacy compatibility
      isConnecting:
        this.status === "connecting" || this.status === "reconnecting",
      isConnected: this.status === "connected",
    };
  }

  // Get the currently connected doc
  getConnectedDoc(): Y.Doc | null {
    return this.connectedDoc;
  }

  // Subscribe to state changes
  subscribe(listener: P2PSyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  // Subscribe to disconnect events (for notifications)
  onDisconnect(listener: DisconnectListener): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private notifyDisconnect(reason: "manual" | "peer_left" | "error"): void {
    this.disconnectListeners.forEach((listener) => listener(reason));
  }

  // Start hosting a sync room
  async hostRoom(doc: Y.Doc): Promise<string> {
    this.clearRetryState();
    if (this.room) {
      this.disconnect();
    }

    const roomCode = generateRoomCode();
    this.autoReconnectEnabled = true;
    this.lastRoomCode = roomCode;
    this.lastDoc = doc;
    await this.joinRoomInternal(roomCode, doc);
    return roomCode;
  }

  // Join an existing sync room
  async joinRoom(roomCode: string, doc: Y.Doc): Promise<void> {
    this.clearRetryState();
    if (this.room) {
      this.disconnect();
    }

    const normalizedCode = normalizeRoomCode(roomCode);
    if (normalizedCode.length !== 6) {
      throw new Error("Invalid room code");
    }

    this.autoReconnectEnabled = true;
    this.lastRoomCode = normalizedCode;
    this.lastDoc = doc;
    await this.joinRoomInternal(normalizedCode, doc);
  }

  // Auto-connect with a known room code (for reconnection on app start)
  async autoConnect(roomCode: string, doc: Y.Doc): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") {
      return; // Already connected or connecting
    }

    const normalizedCode = normalizeRoomCode(roomCode);
    if (normalizedCode.length !== 6) {
      throw new Error("Invalid room code");
    }

    this.autoReconnectEnabled = true;
    this.lastRoomCode = normalizedCode;
    this.lastDoc = doc;

    try {
      await this.joinRoomInternal(normalizedCode, doc);
    } catch {
      // Start retry cycle on failure
      this.scheduleRetry();
    }
  }

  private async joinRoomInternal(roomCode: string, doc: Y.Doc): Promise<void> {
    this.status = this.retryAttempt > 0 ? "reconnecting" : "connecting";
    this.error = null;
    this.roomCode = roomCode;
    this.connectedDoc = doc;
    this.notifyListeners();

    try {
      // Join room using BitTorrent trackers (no server needed)
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
        this.status = "connected";
        this.clearRetryState(); // Connection successful, reset retry state
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
        if (this.peerCount === 0) {
          // All peers left - notify but stay "connected" (waiting for new peers)
          this.notifyDisconnect("peer_left");
        }
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

      // Connection established (even if no peers yet)
      // Note: Status will be "connecting" or "reconnecting" here, so we set it to "connected"
      this.status = "connected";
      this.notifyListeners();
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Connection failed";
      this.status = "error";
      this.notifyListeners();
      this.notifyDisconnect("error");

      // Schedule retry if auto-reconnect is enabled
      if (this.autoReconnectEnabled) {
        this.scheduleRetry();
      }

      throw e;
    }
  }

  private scheduleRetry(): void {
    if (!this.autoReconnectEnabled || !this.lastRoomCode || !this.lastDoc) {
      return;
    }

    if (this.retryAttempt >= RETRY_MAX_ATTEMPTS) {
      this.status = "error";
      this.error = "Max retry attempts reached";
      this.notifyListeners();
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RETRY_BASE_DELAY * Math.pow(2, this.retryAttempt),
      RETRY_MAX_DELAY,
    );

    this.retryAttempt++;
    this.status = "reconnecting";
    this.nextRetryIn = Math.ceil(delay / 1000);
    this.notifyListeners();

    // Countdown timer for UI
    this.countdownInterval = setInterval(() => {
      if (this.nextRetryIn !== null && this.nextRetryIn > 0) {
        this.nextRetryIn--;
        this.notifyListeners();
      }
    }, 1000);

    // Schedule the actual retry
    this.retryTimeout = setTimeout(async () => {
      this.clearCountdown();
      try {
        await this.joinRoomInternal(this.lastRoomCode!, this.lastDoc!);
      } catch {
        // joinRoomInternal will schedule next retry on failure
      }
    }, delay);
  }

  private clearRetryState(): void {
    this.retryAttempt = 0;
    this.nextRetryIn = null;
    this.clearCountdown();
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // Disconnect from the room
  disconnect(): void {
    const wasConnected = this.status === "connected";

    this.clearRetryState();
    this.autoReconnectEnabled = false;
    this.lastRoomCode = null;
    this.lastDoc = null;

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
    this.status = "disconnected";
    this.error = null;
    this.sendSync = null;
    this.sendAwareness = null;
    this.notifyListeners();

    if (wasConnected) {
      this.notifyDisconnect("manual");
    }
  }

  // Cancel auto-reconnect without full disconnect
  cancelReconnect(): void {
    this.clearRetryState();
    this.autoReconnectEnabled = false;
    this.status = "disconnected";
    this.notifyListeners();
  }
}

// Singleton instance
export const p2pSync = new P2PSyncManager();
