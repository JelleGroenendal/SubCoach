import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useCurrentMatch } from "@/data/yjs";
import { Button } from "@/components/ui/button";
import type { Match } from "@/data/schemas";

function isInterruptedMatch(match: Match | undefined): match is Match {
  if (!match) return false;
  // A match is considered "interrupted" if:
  // 1. It's not finished
  // 2. It's been started (has events)
  // 3. Current page is not the live match page
  if (match.status === "finished") return false;
  if (match.status === "setup") return false;
  if (match.events.length === 0) return false;

  // Check if we're on the match page
  const isOnMatchPage = window.location.pathname.startsWith("/match/");
  return !isOnMatchPage;
}

export function CrashRecovery(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeTeamId, initialize } = useTeamStore();
  const { match, clearMatch } = useCurrentMatch(activeTeamId);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Derive whether to show prompt from match state
  const interruptedMatch = useMemo(() => {
    if (dismissed) return null;
    return isInterruptedMatch(match) ? match : null;
  }, [match, dismissed]);

  const handleResume = useCallback(() => {
    setDismissed(true);
    navigate("/match/live");
  }, [navigate]);

  const handleDiscard = useCallback(() => {
    if (activeTeamId) {
      clearMatch();
    }
    setDismissed(true);
  }, [activeTeamId, clearMatch]);

  if (!interruptedMatch) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl",
        )}
        role="alertdialog"
        aria-labelledby="crash-recovery-title"
        aria-describedby="crash-recovery-description"
      >
        <h2
          id="crash-recovery-title"
          className="text-xl font-bold text-foreground"
        >
          {t("crashRecovery.title")}
        </h2>
        <p
          id="crash-recovery-description"
          className="mt-2 text-muted-foreground"
        >
          {t("crashRecovery.description", {
            opponent: interruptedMatch.opponentName,
            score: `${interruptedMatch.homeScore}-${interruptedMatch.awayScore}`,
          })}
        </p>

        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t("crashRecovery.opponent")}
            </span>
            <span className="font-medium">{interruptedMatch.opponentName}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">
              {t("crashRecovery.score")}
            </span>
            <span className="font-medium">
              {interruptedMatch.homeScore} - {interruptedMatch.awayScore}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">
              {t("crashRecovery.period")}
            </span>
            <span className="font-medium">
              {t("match.live.period", {
                period: interruptedMatch.currentPeriod,
              })}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            size="xl"
            className="flex-1 touch-manipulation"
            onClick={handleDiscard}
          >
            {t("crashRecovery.discard")}
          </Button>
          <Button
            variant="default"
            size="xl"
            className="flex-1 touch-manipulation bg-field hover:bg-field/90"
            onClick={handleResume}
          >
            {t("crashRecovery.resume")}
          </Button>
        </div>
      </div>
    </div>
  );
}
