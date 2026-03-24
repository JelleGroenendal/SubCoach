import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMatchStore } from "@/stores/matchStore";
import { calculateFairnessScore } from "@/engine/fairness/calculateFairness";
import { formatTime } from "@/engine/timer/matchTimer";
import { Button } from "@/components/ui/button";
import type { Match, MatchPlayer } from "@/data/schemas";

function getPlayTimeColor(seconds: number, averageSeconds: number): string {
  if (averageSeconds === 0) return "bg-emerald-500";
  const ratio = seconds / averageSeconds;
  if (ratio >= 0.85) return "bg-emerald-500";
  if (ratio >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function getFairnessColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function getFairnessBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/20 border-emerald-500/30";
  if (score >= 50) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
}

function countEventsByType(match: Match, type: string): number {
  return match.events.filter((e) => e.type === type).length;
}

function getScorers(roster: MatchPlayer[]): MatchPlayer[] {
  return roster.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals);
}

export function MatchSummaryPage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const match = useMatchStore((s) => s.match);
  const updateMatchNotes = useMatchStore((s) => s.updateMatchNotes);

  const [matchNotes, setMatchNotes] = useState(match?.notes ?? "");

  const handleMatchNotesChange = useCallback(
    (value: string) => {
      setMatchNotes(value);
      updateMatchNotes(value);
    },
    [updateMatchNotes],
  );

  const fairness = useMemo(() => {
    if (!match) return undefined;
    return calculateFairnessScore(match.roster);
  }, [match]);

  const maxPlayTime = useMemo(() => {
    if (!match) return 0;
    return Math.max(...match.roster.map((p) => p.totalPlayTimeSeconds), 1);
  }, [match]);

  const scorers = useMemo(() => {
    if (!match) return [];
    return getScorers(match.roster);
  }, [match]);

  const substitutionCount = useMemo(() => {
    if (!match) return 0;
    return countEventsByType(match, "substitution");
  }, [match]);

  const penaltyCount = useMemo(() => {
    if (!match) return 0;
    return countEventsByType(match, "penalty");
  }, [match]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">{t("match.summary.noMatch")}</p>
        <Button
          variant="outline"
          size="xl"
          className="mt-4 touch-manipulation"
          onClick={() => navigate("/")}
          aria-label={t("match.summary.backHome")}
        >
          {t("match.summary.backHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 pt-4">
      <h1 className="text-2xl font-bold">{t("match.summary.title")}</h1>

      {/* Score */}
      <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {t("match.summary.vs", { opponent: match.opponentName })}
        </p>
        <div className="mt-2 flex items-baseline gap-4">
          <span className="text-5xl font-bold tabular-nums">
            {match.homeScore}
          </span>
          <span className="text-2xl text-muted-foreground">-</span>
          <span className="text-5xl font-bold tabular-nums">
            {match.awayScore}
          </span>
        </div>
      </div>

      {/* Fairness Score */}
      {fairness && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4",
            getFairnessBgColor(fairness.score),
          )}
        >
          <div>
            <h2 className="font-semibold">{t("match.summary.fairness")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("match.summary.fairnessDescription")}
            </p>
          </div>
          <span
            className={cn(
              "text-3xl font-bold tabular-nums",
              getFairnessColor(fairness.score),
            )}
          >
            {fairness.score}
          </span>
        </div>
      )}

      {/* Play Time Bars */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">{t("match.summary.playTime")}</h2>
        <div className="space-y-2">
          {match.roster
            .slice()
            .sort((a, b) => b.totalPlayTimeSeconds - a.totalPlayTimeSeconds)
            .map((player) => {
              const widthPercent =
                maxPlayTime > 0
                  ? (player.totalPlayTimeSeconds / maxPlayTime) * 100
                  : 0;
              const barColor = fairness
                ? getPlayTimeColor(
                    player.totalPlayTimeSeconds,
                    fairness.averageSeconds,
                  )
                : "bg-emerald-500";

              return (
                <div key={player.playerId} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm font-medium">
                    {player.number !== undefined && (
                      <span className="mr-1 text-muted-foreground">
                        #{player.number}
                      </span>
                    )}
                    {player.name}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className={cn("h-full rounded transition-all", barColor)}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {formatTime(player.totalPlayTimeSeconds)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Goals */}
      {scorers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">{t("match.summary.goals")}</h2>
          <div className="space-y-1">
            {scorers.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between rounded-lg px-2 py-1.5"
              >
                <span className="text-sm font-medium">
                  {player.number !== undefined && (
                    <span className="mr-1 text-muted-foreground">
                      #{player.number}
                    </span>
                  )}
                  {player.name}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {player.goals}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{substitutionCount}</p>
          <p className="text-sm text-muted-foreground">
            {t("match.summary.substitutions")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{penaltyCount}</p>
          <p className="text-sm text-muted-foreground">
            {t("match.summary.penalties")}
          </p>
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">{t("match.summary.notes.title")}</h2>
        <textarea
          value={matchNotes}
          onChange={(e) => handleMatchNotesChange(e.target.value)}
          placeholder={t("match.summary.notes.matchPlaceholder")}
          className={cn(
            "w-full resize-none rounded-lg border border-border bg-background p-3",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
          )}
          rows={3}
        />
      </div>

      {/* Done Button */}
      <Button
        variant="default"
        size="xl"
        className="w-full touch-manipulation"
        onClick={() => navigate("/")}
        aria-label={t("match.summary.done")}
      >
        {t("match.summary.done")}
      </Button>
    </div>
  );
}
