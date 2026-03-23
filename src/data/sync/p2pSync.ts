import { joinRoom, type Room } from "trystero/torrent";
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
type SyncErrorListener = (error: string) => void;

// Exponential backoff config
const RETRY_BASE_DELAY = 2000; // 2 seconds
const RETRY_MAX_DELAY = 30000; // 30 seconds
const RETRY_MAX_ATTEMPTS = 5;

// Heartbeat config
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const HEARTBEAT_TIMEOUT = 15000; // 15 seconds - mark stale if no pong
const MAX_MISSED_HEARTBEATS = 3; // Trigger reconnect after 3 missed

// Sync error threshold
const MAX_CONSECUTIVE_SYNC_ERRORS = 5;

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
  private syncErrorListeners: Set<SyncErrorListener> = new Set();
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

  // Listener cleanup references (A3)
  private docUpdateHandler:
    | ((update: Uint8Array, origin: unknown) => void)
    | null = null;
  private awarenessUpdateHandler:
    | ((
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => void)
    | null = null;

  // Heartbeat state (A1)
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongReceived: number = 0;
  private missedHeartbeats: number = 0;
  private sendPing: ((data: Uint8Array) => void) | null = null;

  // Sync error tracking (A5)
  private consecutiveSyncErrors: number = 0;

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

  // Subscribe to sync errors (A5)
  onSyncError(listener: SyncErrorListener): () => void {
    this.syncErrorListeners.add(listener);
    return () => this.syncErrorListeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private notifyDisconnect(reason: "manual" | "peer_left" | "error"): void {
    this.disconnectListeners.forEach((listener) => listener(reason));
  }

  private notifySyncError(error: string): void {
    this.syncErrorListeners.forEach((listener) => listener(error));
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
    // Clean up any existing listeners before reconnecting (A3)
    this.cleanupListeners();

    this.status = this.retryAttempt > 0 ? "reconnecting" : "connecting";
    this.error = null;
    this.roomCode = roomCode;
    this.connectedDoc = doc;
    this.consecutiveSyncErrors = 0; // Reset sync error count
    this.notifyListeners();

    try {
      // Join room using BitTorrent trackers (no server needed)
      // Configure multiple WebSocket trackers for redundancy and STUN servers for NAT traversal
      this.room = joinRoom(
        {
          appId: "subcoach",
          // Use ALL available WebSocket BitTorrent trackers for maximum redundancy
          // Only wss:// (secure WebSocket) trackers work in browsers
          relayUrls: [
            "wss://tracker.openwebtorrent.com",
            "wss://tracker.webtorrent.dev",
            "wss://tracker.btorrent.xyz",
            "wss://tracker.files.fm:7073/announce",
            "wss://tracker.fastcast.nz",
          ],
          // Configure ICE servers for better NAT traversal
          rtcConfig: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              { urls: "stun:stun3.l.google.com:19302" },
              { urls: "stun:stun4.l.google.com:19302" },
              { urls: "stun:global.stun.twilio.com:3478" },
            ],
          },
        },
        `subcoach-${roomCode}`,
      );

      // Setup awareness for cursor/presence
      this.awareness = new awarenessProtocol.Awareness(doc);

      // Setup sync and awareness channels
      const [sendSync, getSync] = this.room.makeAction<Uint8Array>("sync");
      const [sendAwareness, getAwareness] =
        this.room.makeAction<Uint8Array>("awareness");

      // Setup heartbeat channel (A1)
      const [sendPing, getPing] = this.room.makeAction<Uint8Array>("ping");

      this.sendSync = sendSync;
      this.sendAwareness = sendAwareness;
      this.sendPing = sendPing;

      // Handle incoming sync messages
      getSync((data, peerId) => {
        try {
          console.log(
            "[P2P] Received sync message from",
            peerId,
            "size:",
            data.length,
          );
          const decoder = decoding.createDecoder(data);
          const encoder = encoding.createEncoder();
          const messageType = syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            null,
          );
          console.log(
            "[P2P] Sync message type:",
            messageType,
            "response size:",
            encoding.length(encoder),
          );
          if (encoding.length(encoder) > 0) {
            const responseData = encoding.toUint8Array(encoder);
            console.log(
              "[P2P] Sending sync response, size:",
              responseData.length,
            );
            sendSync(responseData, peerId);
          }
          // Reset sync error count on success
          this.consecutiveSyncErrors = 0;
        } catch (e) {
          console.error("Sync error:", e);
          this.handleSyncError(e);
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
          // Reset sync error count on success
          this.consecutiveSyncErrors = 0;
        } catch (e) {
          console.error("Awareness error:", e);
          this.handleSyncError(e);
        }
      });

      // Handle incoming heartbeat pings (A1)
      getPing((data, peerId) => {
        // Respond to ping with pong (echo back)
        sendPing(data, peerId);
        // Also treat received ping as proof of connection
        this.lastPongReceived = Date.now();
        this.missedHeartbeats = 0;
      });

      // Log successful room creation
      console.log("[P2P] Room created, waiting for peers...");

      // Handle peer join
      this.room.onPeerJoin((peerId) => {
        console.log("[P2P] *** PEER JOINED ***:", peerId);
        this.peerCount++;
        this.status = "connected";
        this.clearRetryState(); // Connection successful, reset retry state
        this.lastPongReceived = Date.now(); // Reset heartbeat on new peer
        this.missedHeartbeats = 0;
        this.notifyListeners();

        // Send initial sync state to new peer (sync step 1 = state vector)
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(encoder, doc);
        const syncData = encoding.toUint8Array(encoder);
        console.log(
          "[P2P] Sending sync step 1 to peer, size:",
          syncData.length,
        );
        sendSync(syncData, peerId);

        // Send awareness state
        sendAwareness(
          awarenessProtocol.encodeAwarenessUpdate(this.awareness!, [
            doc.clientID,
          ]),
        );

        // Start heartbeat monitoring if not already running (A1)
        this.startHeartbeat();
      });

      // Handle peer leave
      this.room.onPeerLeave(() => {
        this.peerCount = Math.max(0, this.peerCount - 1);
        if (this.peerCount === 0) {
          // All peers left - notify but stay "connected" (waiting for new peers)
          this.notifyDisconnect("peer_left");
          // Stop heartbeat when no peers
          this.stopHeartbeat();
        }
        this.notifyListeners();
      });

      // Listen for local doc changes and broadcast (A3 - store handler reference)
      this.docUpdateHandler = (update: Uint8Array, origin: unknown) => {
        if (origin !== "remote" && this.sendSync) {
          const encoder = encoding.createEncoder();
          syncProtocol.writeUpdate(encoder, update);
          this.sendSync(encoding.toUint8Array(encoder));
        }
      };
      doc.on("update", this.docUpdateHandler);

      // Listen for awareness changes and broadcast (A3 - store handler reference)
      this.awarenessUpdateHandler = ({
        added,
        updated,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }) => {
        const changedClients = added.concat(updated);
        if (this.sendAwareness && changedClients.length > 0) {
          this.sendAwareness(
            awarenessProtocol.encodeAwarenessUpdate(
              this.awareness!,
              changedClients,
            ),
          );
        }
      };
      this.awareness.on("update", this.awarenessUpdateHandler);

      // Connection established (even if no peers yet)
      console.log("[P2P] Connected to room, status: connected");
      this.status = "connected";
      this.lastPongReceived = Date.now();
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

  // Handle sync/awareness errors (A5)
  private handleSyncError(e: unknown): void {
    this.consecutiveSyncErrors++;
    const errorMessage = e instanceof Error ? e.message : "Sync error";
    this.notifySyncError(errorMessage);

    // If too many consecutive errors, trigger reconnect (A2 + A5)
    if (this.consecutiveSyncErrors >= MAX_CONSECUTIVE_SYNC_ERRORS) {
      console.warn(
        `Too many sync errors (${this.consecutiveSyncErrors}), triggering reconnect`,
      );
      this.handleMidSessionDisconnect();
    }
  }

  // Handle mid-session disconnect and trigger reconnect (A2)
  private handleMidSessionDisconnect(): void {
    if (!this.autoReconnectEnabled || !this.lastRoomCode || !this.lastDoc) {
      return;
    }

    console.log("Mid-session disconnect detected, attempting to reconnect...");

    // Stop heartbeat
    this.stopHeartbeat();

    // Clean up current broken connection
    this.cleanupListeners();
    if (this.room) {
      try {
        this.room.leave();
      } catch {
        // Ignore errors during cleanup
      }
      this.room = null;
    }
    if (this.awareness) {
      try {
        this.awareness.destroy();
      } catch {
        // Ignore errors during cleanup
      }
      this.awareness = null;
    }

    // Keep lastRoomCode and lastDoc for retry
    this.peerCount = 0;
    this.status = "reconnecting";
    this.sendSync = null;
    this.sendAwareness = null;
    this.sendPing = null;
    this.notifyListeners();
    this.notifyDisconnect("error");

    // Schedule retry
    this.scheduleRetry();
  }

  // Clean up doc and awareness listeners (A3)
  private cleanupListeners(): void {
    if (this.connectedDoc && this.docUpdateHandler) {
      this.connectedDoc.off("update", this.docUpdateHandler);
      this.docUpdateHandler = null;
    }
    if (this.awareness && this.awarenessUpdateHandler) {
      this.awareness.off("update", this.awarenessUpdateHandler);
      this.awarenessUpdateHandler = null;
    }
  }

  // Start heartbeat monitoring (A1)
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return; // Already running

    this.lastPongReceived = Date.now();
    this.missedHeartbeats = 0;

    this.heartbeatInterval = setInterval(() => {
      // Send ping to all peers
      if (this.sendPing && this.peerCount > 0) {
        const pingData = new Uint8Array([Date.now() % 256]); // Simple ping payload
        this.sendPing(pingData);
      }

      // Check if we've received a pong recently
      const timeSinceLastPong = Date.now() - this.lastPongReceived;
      if (timeSinceLastPong > HEARTBEAT_TIMEOUT && this.peerCount > 0) {
        this.missedHeartbeats++;
        console.warn(
          `Heartbeat timeout (${this.missedHeartbeats}/${MAX_MISSED_HEARTBEATS})`,
        );

        if (this.missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
          console.warn("Too many missed heartbeats, triggering reconnect");
          this.handleMidSessionDisconnect();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  // Stop heartbeat monitoring (A1)
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.missedHeartbeats = 0;
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

      // Guard: check if still valid (A4 - race condition fix)
      if (!this.autoReconnectEnabled || !this.lastRoomCode || !this.lastDoc) {
        return;
      }

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

    // Stop heartbeat (A1)
    this.stopHeartbeat();

    this.clearRetryState();
    this.autoReconnectEnabled = false;
    this.lastRoomCode = null;
    this.lastDoc = null;

    // Clean up listeners before disconnecting (A3)
    this.cleanupListeners();

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
    this.sendPing = null;
    this.consecutiveSyncErrors = 0;
    this.notifyListeners();

    if (wasConnected) {
      this.notifyDisconnect("manual");
    }
  }

  // Cancel auto-reconnect without full disconnect (A4 - fixed race condition)
  cancelReconnect(): void {
    this.clearRetryState();
    this.autoReconnectEnabled = false;
    this.lastRoomCode = null; // A4: Clear these to prevent race condition
    this.lastDoc = null; // A4: Clear these to prevent race condition
    this.status = "disconnected";
    this.notifyListeners();
  }
}

// Singleton instance
export const p2pSync = new P2PSyncManager();
