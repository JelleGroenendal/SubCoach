import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useP2PSync, normalizeRoomCode } from "@/data/sync";
import type * as Y from "yjs";

interface P2PSyncPanelProps {
  doc: Y.Doc;
  onClose: () => void;
}

export function P2PSyncPanel({
  doc,
  onClose,
}: P2PSyncPanelProps): React.ReactNode {
  const { t } = useTranslation();
  const {
    roomCode,
    peerCount,
    isConnecting,
    isConnected,
    error,
    hostRoom,
    joinRoom,
    disconnect,
  } = useP2PSync();

  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"choose" | "host" | "join">("choose");

  const handleHost = useCallback(async () => {
    try {
      await hostRoom(doc);
      setMode("host");
    } catch (e) {
      console.error("Failed to host room:", e);
    }
  }, [doc, hostRoom]);

  const handleJoin = useCallback(async () => {
    const normalized = normalizeRoomCode(joinCode);
    if (normalized.length !== 6) return;

    try {
      await joinRoom(normalized, doc);
    } catch (e) {
      console.error("Failed to join room:", e);
    }
  }, [joinCode, doc, joinRoom]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setMode("choose");
    setJoinCode("");
  }, [disconnect]);

  // Already connected - show status
  if (isConnected || roomCode) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("sync.connected")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("sync.roomCode")}
            </span>
            <span className="font-mono text-xl font-bold tracking-widest">
              {roomCode}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("sync.coaches")}
            </span>
            <span className="text-lg font-semibold text-green-500">
              {peerCount + 1}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{t("sync.shareCode")}</p>

        <Button size="xl" variant="destructive" onClick={handleDisconnect}>
          {t("sync.disconnect")}
        </Button>
      </div>
    );
  }

  // Choose mode
  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("sync.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{t("sync.description")}</p>

        <div className="flex flex-col gap-2">
          <Button
            size="xl"
            variant="default"
            onClick={handleHost}
            disabled={isConnecting}
          >
            {t("sync.hostRoom")}
          </Button>
          <Button size="xl" variant="secondary" onClick={() => setMode("join")}>
            {t("sync.joinRoom")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Join mode
  if (mode === "join") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("sync.joinRoom")}</h3>
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t("common.back")}
          >
            ←
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">
            {t("sync.enterCode")}
          </label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className={cn(
              "min-h-14 touch-manipulation rounded-lg border border-input bg-background px-4",
              "text-center text-2xl font-mono font-bold tracking-widest",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          />
        </div>

        <Button
          size="xl"
          variant="default"
          onClick={handleJoin}
          disabled={isConnecting || normalizeRoomCode(joinCode).length !== 6}
        >
          {isConnecting ? t("sync.connecting") : t("sync.connect")}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Host mode - waiting for peers
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("sync.waitingForCoaches")}</h3>
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t("common.close")}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 py-4">
        <span className="text-sm text-muted-foreground">
          {t("sync.roomCode")}
        </span>
        <span className="font-mono text-3xl font-bold tracking-widest">
          {roomCode}
        </span>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("sync.shareCodeInstructions")}
      </p>

      {isConnecting && (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {t("sync.connecting")}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
