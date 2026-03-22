import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useTeamStore } from "@/stores/teamStore";
import { p2pSync } from "@/data/sync/p2pSync";
import { getTeamDoc } from "@/data/yjs/yjsProvider";

interface TeamSyncSectionProps {
  teamId: string;
  syncRoomCode: string | undefined;
}

/**
 * Section in TeamEditPage for enabling/disabling persistent P2P sync.
 * When enabled, the team will automatically sync with other coaches
 * who have the same room code.
 */
export function TeamSyncSection({
  teamId,
  syncRoomCode,
}: TeamSyncSectionProps): React.ReactNode {
  const { t } = useTranslation();
  const { enableSync, disableSync } = useTeamStore();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnableSync = useCallback(async () => {
    setIsEnabling(true);
    try {
      // Generate and save new room code
      const roomCode = enableSync();
      if (roomCode) {
        // Start hosting the room
        const doc = getTeamDoc(teamId);
        await p2pSync.hostRoom(doc);
      }
    } catch (error) {
      console.error("Failed to enable sync:", error);
    } finally {
      setIsEnabling(false);
    }
  }, [teamId, enableSync]);

  const handleDisableSync = useCallback(() => {
    // Disconnect from P2P and clear the room code
    p2pSync.disconnect();
    disableSync();
  }, [disableSync]);

  const isSyncEnabled = Boolean(syncRoomCode);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("sync.enableSync")}</h2>
        {isSyncEnabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-900/30 px-2 py-1 text-xs font-medium text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {t("sync.syncEnabled")}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {t("sync.enableSyncDescription")}
      </p>

      {isSyncEnabled ? (
        <div className="flex flex-col gap-4">
          {/* Show room code */}
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4">
            <span className="text-sm text-muted-foreground">
              {t("sync.roomCode")}
            </span>
            <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
              {syncRoomCode}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("sync.shareCodeInstructions")}
            </p>
          </div>

          <Button
            size="xl"
            variant="destructive"
            className="touch-manipulation self-start"
            onClick={handleDisableSync}
          >
            {t("sync.disableSync")}
          </Button>
        </div>
      ) : (
        <Button
          size="xl"
          variant="default"
          className="touch-manipulation self-start"
          onClick={handleEnableSync}
          disabled={isEnabling}
        >
          {isEnabling ? t("sync.connecting") : t("sync.enableSync")}
        </Button>
      )}
    </section>
  );
}
