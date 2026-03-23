import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTeamSync, normalizeRoomCode } from "@/data/sync";

/**
 * Standalone page for receiving a team from another coach.
 * This page can be accessed without having a local team first.
 */
export function JoinTeamPage(): React.ReactNode {
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
    joinTeamShare,
    disconnect,
  } = useTeamSync();

  const [joinCode, setJoinCode] = useState("");

  const handleJoin = useCallback(async () => {
    const normalized = normalizeRoomCode(joinCode);
    if (normalized.length !== 6) return;

    try {
      const importedTeamId = await joinTeamShare(normalized);
      if (importedTeamId) {
        // Team was successfully imported, navigate to home
        navigate("/");
      }
    } catch (e) {
      console.error("Failed to join team share:", e);
    }
  }, [joinCode, joinTeamShare, navigate]);

  const handleCancel = useCallback(() => {
    disconnect();
    navigate("/");
  }, [disconnect, navigate]);

  // Team was imported successfully
  if (teamImported) {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        <div className="mx-auto max-w-md rounded-xl border border-green-500/50 bg-green-500/10 p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl">&#10003;</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-green-500">
            {t("joinTeam.success")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("joinTeam.successDescription")}
          </p>
          <Button
            size="xl"
            variant="default"
            className="mt-6 w-full"
            onClick={() => {
              disconnect();
              navigate("/");
            }}
          >
            {t("joinTeam.goToTeam")}
          </Button>
        </div>
      </div>
    );
  }

  // Connected and waiting for data
  if (isConnected && mode === "joining") {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("joinTeam.title")}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t("joinTeam.receiving")}
          </p>
        </div>

        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("sync.roomCode")}
              </span>
              <span className="font-mono text-xl font-bold tracking-widest">
                {roomCode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("joinTeam.connectedCoaches")}
              </span>
              <span className="text-lg font-semibold text-green-500">
                {peerCount + 1}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span className="text-muted-foreground">
                {t("joinTeam.waitingForData")}
              </span>
            </div>

            <Button
              size="xl"
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - enter code
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("joinTeam.title")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t("joinTeam.description")}
        </p>
      </div>

      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              {t("joinTeam.enterCode")}
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              className={cn(
                "min-h-16 touch-manipulation rounded-lg border border-input bg-background px-4",
                "text-center text-3xl font-mono font-bold tracking-widest",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            />
          </div>

          <Button
            size="xl"
            variant="default"
            onClick={handleJoin}
            disabled={isConnecting || normalizeRoomCode(joinCode).length !== 6}
            className="w-full"
          >
            {isConnecting ? t("sync.connecting") : t("joinTeam.connect")}
          </Button>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <div className="border-t border-border pt-4">
            <Link
              to="/"
              className={cn(
                "flex min-h-12 w-full items-center justify-center",
                "touch-manipulation rounded-lg bg-secondary px-4 py-2",
                "text-center font-medium text-secondary-foreground",
                "transition-colors hover:bg-secondary/90",
              )}
            >
              {t("common.back")}
            </Link>
          </div>
        </div>
      </div>

      <p className="max-w-md text-center text-sm text-muted-foreground">
        {t("joinTeam.helpText")}
      </p>
    </div>
  );
}
