import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTeamSync, normalizeRoomCode } from "@/data/sync";

interface TeamSharePanelProps {
  teamId: string;
  onClose: () => void;
}

export function TeamSharePanel({
  teamId,
  onClose,
}: TeamSharePanelProps): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    roomCode,
    peerCount,
    isConnecting,
    isConnected,
    error,
    mode,
    teamImported,
    hostTeamShare,
    joinTeamShare,
    disconnect,
  } = useTeamSync();

  const [joinCode, setJoinCode] = useState("");
  const [uiMode, setUiMode] = useState<"choose" | "host" | "join">("choose");

  const handleHost = useCallback(async () => {
    try {
      await hostTeamShare(teamId);
      setUiMode("host");
    } catch (e) {
      console.error("Failed to host team share:", e);
    }
  }, [teamId, hostTeamShare]);

  const handleJoin = useCallback(async () => {
    const normalized = normalizeRoomCode(joinCode);
    if (normalized.length !== 6) return;

    try {
      const importedTeamId = await joinTeamShare(normalized);
      if (importedTeamId) {
        // Team was successfully imported, navigate to it
        navigate("/");
      }
    } catch (e) {
      console.error("Failed to join team share:", e);
    }
  }, [joinCode, joinTeamShare, navigate]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setUiMode("choose");
    setJoinCode("");
  }, [disconnect]);

  // Team was imported successfully
  if (teamImported) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-green-500/50 bg-green-500/10 p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✓</span>
          <h3 className="text-lg font-semibold text-green-500">
            {t("teamShare.imported")}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("teamShare.importedDescription")}
        </p>

        <Button
          size="xl"
          variant="default"
          onClick={() => {
            disconnect();
            navigate("/");
          }}
        >
          {t("teamShare.goToTeam")}
        </Button>
      </div>
    );
  }

  // Already connected - show sync status
  if (isConnected || roomCode) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {mode === "hosting"
              ? t("teamShare.sharing")
              : t("teamShare.receiving")}
          </h3>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-foreground"
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
              {t("teamShare.connectedCoaches")}
            </span>
            <span className="text-lg font-semibold text-green-500">
              {peerCount + 1}
            </span>
          </div>
        </div>

        {mode === "hosting" && (
          <p className="text-sm text-muted-foreground">
            {t("teamShare.shareCodeWithCoach")}
          </p>
        )}

        {mode === "joining" && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              {t("teamShare.waitingForData")}
            </span>
          </div>
        )}

        <Button size="xl" variant="destructive" onClick={handleDisconnect}>
          {t("sync.disconnect")}
        </Button>
      </div>
    );
  }

  // Choose mode
  if (uiMode === "choose") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("teamShare.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("teamShare.description")}
        </p>

        <div className="flex flex-col gap-2">
          <Button
            size="xl"
            variant="default"
            onClick={handleHost}
            disabled={isConnecting}
          >
            {t("teamShare.shareTeam")}
          </Button>
          <Button
            size="xl"
            variant="secondary"
            onClick={() => setUiMode("join")}
          >
            {t("teamShare.receiveTeam")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Join mode - enter code to receive team
  if (uiMode === "join") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {t("teamShare.receiveTeam")}
          </h3>
          <button
            type="button"
            onClick={() => setUiMode("choose")}
            className="text-muted-foreground hover:text-foreground"
          >
            ←
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("teamShare.enterCodeFromCoach")}
        </p>

        <div className="flex flex-col gap-2">
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
          {isConnecting ? t("sync.connecting") : t("teamShare.connect")}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Host mode - waiting for peers
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("teamShare.waitingForCoach")}
        </h3>
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-muted-foreground hover:text-foreground"
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
        {t("teamShare.shareCodeWithCoach")}
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
