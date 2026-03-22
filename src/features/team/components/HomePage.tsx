import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { getSportProfile } from "@/engine/sport-profiles";

function shouldShowHelp(): boolean {
  return localStorage.getItem("subcoach_help_seen") !== "true";
}

export function HomePage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { team, players, loading, initialize } = useTeamStore();

  // Redirect to help page on first use
  useEffect(() => {
    if (shouldShowHelp()) {
      navigate("/help", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Must call hooks before any early returns
  const sportProfile = useMemo(
    () => (team ? getSportProfile(team.sportProfileId) : undefined),
    [team],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("home.title")}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {t("home.subtitle")}
          </p>
        </div>

        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {t("home.welcome.title")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("home.welcome.description")}
          </p>
          <Link
            to="/team/edit"
            className={cn(
              "mt-6 inline-flex min-h-16 min-w-16 items-center justify-center",
              "touch-manipulation rounded-lg bg-primary px-8 py-4",
              "text-lg font-medium text-primary-foreground",
              "transition-colors hover:bg-primary/90",
            )}
          >
            {t("home.welcome.createTeam")}
          </Link>
        </div>
      </div>
    );
  }

  const activePlayers = players.filter((p) => p.active);
  const benchCount = Math.max(
    0,
    activePlayers.length - team.settings.playersOnField,
  );
  const sportName = sportProfile ? t(sportProfile.name) : team.sportProfileId;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("home.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("home.subtitle")}</p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">{team.name}</h2>
        {team.clubName && (
          <p className="mt-1 text-sm text-muted-foreground">{team.clubName}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{t("home.teamInfo.sport", { sport: sportName })}</span>
          <span className="text-border">|</span>
          <span>
            {t("home.teamInfo.playerCount", {
              total: activePlayers.length,
              field: team.settings.playersOnField,
              bench: benchCount,
            })}
          </span>
          <span className="text-border">|</span>
          <span>
            {t("home.teamInfo.period", {
              count: team.settings.periodCount,
              duration: team.settings.periodDurationMinutes,
            })}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
        <Link
          to="/team/edit"
          className={cn(
            "flex flex-1 min-h-16 min-w-16 items-center justify-center",
            "touch-manipulation rounded-lg bg-primary px-6 py-4",
            "text-center text-lg font-medium text-primary-foreground",
            "transition-colors hover:bg-primary/90",
          )}
        >
          {t("home.editTeam")}
        </Link>
        <Link
          to="/match/setup"
          className={cn(
            "flex flex-1 min-h-16 min-w-16 items-center justify-center",
            "touch-manipulation rounded-lg bg-field px-6 py-4",
            "text-center text-lg font-medium text-white",
            "transition-colors hover:bg-field/90",
          )}
        >
          {t("home.startMatch")}
        </Link>
        <Link
          to="/history"
          className={cn(
            "flex flex-1 min-h-16 min-w-16 items-center justify-center",
            "touch-manipulation rounded-lg bg-secondary px-6 py-4",
            "text-center text-lg font-medium text-secondary-foreground",
            "transition-colors hover:bg-secondary/90",
          )}
        >
          {t("home.matchHistory")}
        </Link>
      </div>
    </div>
  );
}
