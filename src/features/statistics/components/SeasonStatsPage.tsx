import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { getMatches } from "@/data/yjs/teamDoc";
import { calculateSeasonStats } from "@/engine/statistics";
import { getSportProfile } from "@/engine/sport-profiles";
import { MatchSchema } from "@/data/schemas";
import type { Match } from "@/data/schemas";
import type { SeasonStats, PlayerSeasonStats } from "@/engine/statistics";

export function SeasonStatsPage(): React.ReactNode {
  const { t } = useTranslation();
  const { team, loading, initialize } = useTeamStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Get all finished matches and calculate stats
  const stats: SeasonStats | undefined = useMemo(() => {
    if (!team) return undefined;

    const rawMatches = getMatches(team.id);
    const matches: Match[] = [];

    for (const raw of rawMatches) {
      const parsed = MatchSchema.safeParse(raw);
      if (parsed.success && parsed.data.status === "finished") {
        matches.push(parsed.data);
      }
    }

    if (matches.length === 0) return undefined;

    return calculateSeasonStats(matches);
  }, [team]);

  // Get positions for this sport
  const positions = useMemo(() => {
    if (!team) return [];
    const profile = getSportProfile(team.sportProfileId);
    return profile?.players.positions ?? [];
  }, [team]);

  // Get position abbreviation
  const getPositionAbbr = (
    positionId: string | undefined,
  ): string | undefined => {
    if (!positionId) return undefined;
    const position = positions.find((p) => p.id === positionId);
    return position ? t(position.abbreviation) : undefined;
  };

  if (loading || !team) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!stats || stats.team.matchesPlayed === 0) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h1 className="text-2xl font-bold">{t("stats.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("stats.description")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{t("stats.noMatches")}</p>
        </div>
      </div>
    );
  }

  const { team: teamStats, players: playerStats } = stats;

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("stats.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("stats.description")}</p>
      </div>

      {/* Team Stats */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">{t("stats.teamStats")}</h2>

        {/* Win/Draw/Loss Record */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-green-500">
              {teamStats.wins}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("stats.wins")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-muted-foreground">
              {teamStats.draws}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("stats.draws")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-red-500">
              {teamStats.losses}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("stats.losses")}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          <StatCard
            label={t("stats.matchesPlayed")}
            value={teamStats.matchesPlayed}
          />
          <StatCard
            label={t("stats.winPercentage")}
            value={`${Math.round(teamStats.winPercentage)}%`}
          />
          <StatCard
            label={t("stats.goalsScored")}
            value={teamStats.goalsScored}
            subValue={`${teamStats.avgGoalsScored.toFixed(1)} ${t("stats.perMatch")}`}
          />
          <StatCard
            label={t("stats.goalsConceded")}
            value={teamStats.goalsConceded}
            subValue={`${teamStats.avgGoalsConceded.toFixed(1)} ${t("stats.perMatch")}`}
          />
          <StatCard
            label={t("stats.goalDifference")}
            value={
              teamStats.goalDifference > 0
                ? `+${teamStats.goalDifference}`
                : teamStats.goalDifference
            }
            valueColor={
              teamStats.goalDifference > 0
                ? "text-green-500"
                : teamStats.goalDifference < 0
                  ? "text-red-500"
                  : undefined
            }
          />
        </div>
      </section>

      {/* Player Stats */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">{t("stats.playerStats")}</h2>

        {/* Player Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">
                  {t("stats.player")}
                </th>
                <th className="pb-2 px-2 text-center font-medium text-muted-foreground">
                  {t("stats.matches")}
                </th>
                <th className="pb-2 px-2 text-center font-medium text-muted-foreground">
                  {t("stats.playTime")}
                </th>
                <th className="pb-2 px-2 text-center font-medium text-muted-foreground">
                  {t("stats.avgPlayTime")}
                </th>
                <th className="pb-2 px-2 text-center font-medium text-muted-foreground">
                  {t("stats.playPercent")}
                </th>
                <th className="pb-2 px-2 text-center font-medium text-muted-foreground">
                  {t("stats.goals")}
                </th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((player) => (
                <PlayerStatsRow
                  key={player.playerId}
                  player={player}
                  positionAbbr={getPositionAbbr(player.positionId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  valueColor,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  valueColor?: string;
}): React.ReactNode {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-bold", valueColor)}>{value}</span>
      {subValue && (
        <span className="text-xs text-muted-foreground">{subValue}</span>
      )}
    </div>
  );
}

function PlayerStatsRow({
  player,
  positionAbbr,
}: {
  player: PlayerSeasonStats;
  positionAbbr: string | undefined;
}): React.ReactNode {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 pr-4">
        <div className="flex items-center gap-2">
          {player.number !== undefined && (
            <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
              {player.number}
            </span>
          )}
          <span className="font-medium">{player.name}</span>
          {positionAbbr && (
            <span className="rounded bg-primary/20 px-1 text-xs font-medium text-primary">
              {positionAbbr}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        {player.matchesPlayed}
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        {player.totalPlayTimeMinutes}m
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        {player.avgPlayTimeMinutes}m
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        {Math.round(player.playTimePercentage)}%
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        {player.goals > 0 ? player.goals : "-"}
      </td>
    </tr>
  );
}
