import { useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useMatchHistory } from "@/data/yjs";
import { calculateFairnessScore } from "@/engine/fairness/calculateFairness";
import { formatTime } from "@/engine/timer/matchTimer";
import { Button } from "@/components/ui/button";
import type { Match, MatchEvent, MatchPlayer } from "@/data/schemas";

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

function formatMatchDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function buildEventDescription(
  event: MatchEvent,
  rosterMap: Map<string, MatchPlayer>,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | undefined {
  switch (event.type) {
    case "substitution": {
      const playerIn = rosterMap.get(event.playerInId);
      const playerOut = rosterMap.get(event.playerOutId);
      return t("history.detail.event.substitution", {
        playerIn: playerIn?.name ?? "?",
        playerOut: playerOut?.name ?? "?",
      });
    }
    case "goal": {
      const player = rosterMap.get(event.playerId);
      return t("history.detail.event.goal", {
        player: player?.name ?? "?",
      });
    }
    case "opponentGoal":
      return t("history.detail.event.opponentGoal");
    case "penalty": {
      const player = rosterMap.get(event.playerId);
      return t("history.detail.event.penalty", {
        player: player?.name ?? "?",
        duration: Math.floor(event.durationSeconds / 60),
      });
    }
    case "yellowCard": {
      const player = rosterMap.get(event.playerId);
      return t("history.detail.event.yellowCard", {
        player: player?.name ?? "?",
      });
    }
    case "redCard": {
      const player = rosterMap.get(event.playerId);
      return t("history.detail.event.redCard", {
        player: player?.name ?? "?",
      });
    }
    case "injury": {
      const player = rosterMap.get(event.playerId);
      return t("history.detail.event.injury", {
        player: player?.name ?? "?",
      });
    }
    case "periodStart":
      return t("history.detail.event.periodStart", {
        period: event.period,
      });
    case "periodEnd":
      return t("history.detail.event.periodEnd", {
        period: event.period,
      });
    case "timeout":
      return t("history.detail.event.timeout");
    case "penaltyEnd":
    case "undo":
      return undefined;
  }
}

export function HistoryDetailPage(): React.ReactNode {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeTeamId, initialize } = useTeamStore();
  const { matches } = useMatchHistory(activeTeamId);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const match = useMemo((): Match | undefined => {
    return matches.find((m: Match) => m.id === id);
  }, [matches, id]);

  const rosterMap = useMemo(() => {
    if (!match) return new Map<string, MatchPlayer>();
    const map = new Map<string, MatchPlayer>();
    for (const player of match.roster) {
      map.set(player.playerId, player);
    }
    return map;
  }, [match]);

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
    return match.roster
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals);
  }, [match]);

  const timelineEvents = useMemo(() => {
    if (!match) return [];
    return match.events
      .map((event) => {
        const description = buildEventDescription(event, rosterMap, t);
        if (!description) return undefined;
        return {
          timestamp: event.timestamp,
          description,
        };
      })
      .filter(
        (e): e is { timestamp: number; description: string } => e !== undefined,
      );
  }, [match, rosterMap, t]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-semibold">{t("history.detail.notFound")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("history.detail.notFoundDescription")}
        </p>
        <Button
          variant="outline"
          size="xl"
          className="mt-6 touch-manipulation"
          onClick={() => navigate("/history")}
          aria-label={t("history.detail.backToHistory")}
        >
          {t("history.detail.backToHistory")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-12 min-w-12 touch-manipulation"
          onClick={() => navigate("/history")}
          aria-label={t("history.detail.backToHistory")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("history.detail.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {formatMatchDate(match.date, i18n.language)}
          </p>
        </div>
      </div>

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

      {/* Event Timeline */}
      {timelineEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">{t("history.detail.timeline")}</h2>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {timelineEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm"
              >
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                  {formatTime(event.timestamp)}
                </span>
                <span className="text-foreground">{event.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section - only shown if there are notes */}
      {(match.notes ||
        match.roster.some((p) => p.notes && p.notes.length > 0)) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">
            {t("match.summary.notes.title")}
          </h2>

          {/* Match Notes */}
          {match.notes && (
            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm whitespace-pre-wrap">{match.notes}</p>
            </div>
          )}

          {/* Player Notes */}
          {match.roster.some((p) => p.notes && p.notes.length > 0) && (
            <div className="space-y-2">
              {match.roster
                .filter((p) => p.notes && p.notes.length > 0)
                .map((player) => (
                  <div
                    key={player.playerId}
                    className="rounded-lg bg-muted/50 p-3"
                  >
                    <p className="text-sm font-medium">
                      {player.number !== undefined && (
                        <span className="mr-1 text-muted-foreground">
                          #{player.number}
                        </span>
                      )}
                      {player.name}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                      {player.notes}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <Button
        variant="outline"
        size="xl"
        className="w-full touch-manipulation"
        onClick={() => navigate("/history")}
        aria-label={t("history.detail.backToHistory")}
      >
        {t("history.detail.backToHistory")}
      </Button>
    </div>
  );
}
