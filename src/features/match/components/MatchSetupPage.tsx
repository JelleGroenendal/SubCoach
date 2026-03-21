import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useMatchStore } from "@/stores/matchStore";
import { Button } from "@/components/ui/button";
import type { MatchPlayer } from "@/data/schemas";

const PERIOD_DURATION_OPTIONS = [10, 15, 20, 25, 30] as const;
const PLAYERS_ON_FIELD_OPTIONS = [
  { value: 5, label: "4+1" },
  { value: 6, label: "5+1" },
  { value: 7, label: "6+1" },
] as const;

type PlayerSelection = {
  playerId: string;
  name: string;
  number: number | undefined;
  assignment: "field" | "bench" | "unavailable";
};

function buildInitialSelections(team: {
  players: Array<{
    id: string;
    name: string;
    number?: number;
    active: boolean;
  }>;
  settings: { playersOnField: number };
}): PlayerSelection[] {
  const activePlayers = team.players.filter((p) => p.active);
  return activePlayers.map((p, index) => ({
    playerId: p.id,
    name: p.name,
    number: p.number,
    assignment:
      index < team.settings.playersOnField
        ? ("field" as const)
        : ("bench" as const),
  }));
}

export function MatchSetupPage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { team, loading, loadTeam } = useTeamStore();
  const { createMatch } = useMatchStore();

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  // Render a sub-component once team is loaded to avoid
  // the "setState in effect" issue. Initial state derives from team.
  if (loading || !team) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (team.players.filter((p) => p.active).length < 2) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <h1 className="text-2xl font-bold">{t("match.setup.title")}</h1>
        <p className="text-center text-muted-foreground">
          {t("match.setup.notEnoughPlayers")}
        </p>
        <Button
          size="match"
          variant="default"
          className="touch-manipulation"
          onClick={() => navigate("/team/edit")}
        >
          {t("match.setup.goToTeam")}
        </Button>
      </div>
    );
  }

  return (
    <MatchSetupForm team={team} createMatch={createMatch} navigate={navigate} />
  );
}

function MatchSetupForm({
  team,
  createMatch,
  navigate,
}: {
  team: {
    id: string;
    players: Array<{
      id: string;
      name: string;
      number?: number;
      active: boolean;
    }>;
    settings: {
      periodDurationMinutes: number;
      periodCount: number;
      playersOnField: number;
    };
  };
  createMatch: (params: {
    teamId: string;
    opponentName: string;
    roster: MatchPlayer[];
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
  }) => void;
  navigate: (path: string) => void;
}): React.ReactNode {
  const { t } = useTranslation();

  // State initialized directly from team (no effects needed)
  const [opponentName, setOpponentName] = useState("");
  const [periodDuration, setPeriodDuration] = useState(
    team.settings.periodDurationMinutes,
  );
  const [periodCount] = useState(team.settings.periodCount);
  const [playersOnField, setPlayersOnField] = useState(
    team.settings.playersOnField,
  );
  const [selections, setSelections] = useState<PlayerSelection[]>(() =>
    buildInitialSelections(team),
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressTriggeredRef = useRef(false);

  const fieldCount = useMemo(
    () => selections.filter((s) => s.assignment === "field").length,
    [selections],
  );

  const availableCount = useMemo(
    () => selections.filter((s) => s.assignment !== "unavailable").length,
    [selections],
  );

  const requiredOnField = playersOnField;

  const canStart =
    fieldCount === requiredOnField && opponentName.trim().length > 0;

  const handleToggleAssignment = useCallback(
    (playerId: string) => {
      setSelections((prev) =>
        prev.map((s) => {
          if (s.playerId !== playerId) return s;
          if (s.assignment === "unavailable") return s;

          if (s.assignment === "field") {
            return { ...s, assignment: "bench" };
          }
          const currentFieldCount = prev.filter(
            (ps) => ps.assignment === "field" && ps.playerId !== playerId,
          ).length;
          if (currentFieldCount < requiredOnField) {
            return { ...s, assignment: "field" };
          }
          return s;
        }),
      );
    },
    [requiredOnField],
  );

  const handleToggleUnavailable = useCallback((playerId: string) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.playerId !== playerId) return s;
        if (s.assignment === "unavailable") {
          return { ...s, assignment: "bench" };
        }
        return { ...s, assignment: "unavailable" };
      }),
    );
  }, []);

  const handlePointerDown = useCallback(
    (playerId: string) => {
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        handleToggleUnavailable(playerId);
      }, 600);
    },
    [handleToggleUnavailable],
  );

  const handlePointerUp = useCallback(
    (playerId: string) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
      if (!longPressTriggeredRef.current) {
        handleToggleAssignment(playerId);
      }
    },
    [handleToggleAssignment],
  );

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  }, []);

  const handleStart = useCallback(() => {
    if (!canStart) return;

    const roster: MatchPlayer[] = selections
      .filter((s) => s.assignment !== "unavailable")
      .map((s) => ({
        playerId: s.playerId,
        name: s.name,
        number: s.number,
        status: s.assignment as "field" | "bench",
        totalPlayTimeSeconds: 0,
        goals: 0,
        periods: [],
      }));

    createMatch({
      teamId: team.id,
      opponentName: opponentName.trim(),
      roster,
      periodDurationMinutes: periodDuration,
      periodCount,
      playersOnField: requiredOnField,
    });

    navigate("/match/live");
  }, [
    canStart,
    selections,
    opponentName,
    periodDuration,
    periodCount,
    requiredOnField,
    team.id,
    createMatch,
    navigate,
  ]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">{t("match.setup.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("match.setup.description")}
        </p>
      </div>

      {/* Opponent */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {t("match.setup.opponent.title")}
        </h2>
        <input
          type="text"
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          className={cn(
            "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
            "text-base text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring",
          )}
          placeholder={t("match.setup.opponent.placeholder")}
          maxLength={100}
        />
      </section>

      {/* Match Settings */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {t("match.setup.settings.title")}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="setup-period-duration"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("team.edit.settings.periodDuration")}
            </label>
            <select
              id="setup-period-duration"
              value={periodDuration}
              onChange={(e) => setPeriodDuration(parseInt(e.target.value, 10))}
              className={cn(
                "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
                "text-base text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            >
              {PERIOD_DURATION_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {t("team.edit.settings.periodDurationValue", {
                    minutes: min,
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {t("team.edit.settings.periodCount")}
            </label>
            <div
              className={cn(
                "min-h-12 flex items-center rounded-lg border border-input bg-muted px-3 py-2",
                "text-base text-muted-foreground",
              )}
            >
              {periodCount}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="setup-players-on-field"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("team.edit.settings.playersOnField")}
            </label>
            <select
              id="setup-players-on-field"
              value={playersOnField}
              onChange={(e) => setPlayersOnField(parseInt(e.target.value, 10))}
              className={cn(
                "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
                "text-base text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            >
              {PLAYERS_ON_FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t("team.edit.settings.playersOnFieldValue", {
                    total: opt.value,
                    format: opt.label,
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Player Selection */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t("match.setup.players.title")}
          </h2>
          <span
            className={cn(
              "text-sm font-medium",
              fieldCount === requiredOnField
                ? "text-green-400"
                : "text-amber-400",
            )}
          >
            {t("match.setup.players.fieldCount", {
              current: fieldCount,
              total: availableCount,
              required: requiredOnField,
            })}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("match.setup.players.instructions")}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {selections.map((selection) => (
            <button
              key={selection.playerId}
              type="button"
              onPointerDown={() => handlePointerDown(selection.playerId)}
              onPointerUp={() => handlePointerUp(selection.playerId)}
              onPointerLeave={handlePointerLeave}
              onContextMenu={(e) => {
                e.preventDefault();
                handleToggleUnavailable(selection.playerId);
              }}
              className={cn(
                "flex min-h-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg border-2 p-3",
                "text-center transition-colors select-none",
                selection.assignment === "field" &&
                  "border-green-500 bg-field text-white",
                selection.assignment === "bench" &&
                  "border-border bg-bench text-foreground",
                selection.assignment === "unavailable" &&
                  "border-border bg-background text-muted-foreground opacity-40 line-through",
              )}
              aria-label={t("match.setup.players.togglePlayer", {
                name: selection.name,
              })}
            >
              {selection.number !== undefined && (
                <span className="text-xs font-bold opacity-70">
                  #{selection.number}
                </span>
              )}
              <span className="text-sm font-medium leading-tight">
                {selection.name}
              </span>
              <span className="text-xs opacity-70">
                {selection.assignment === "field" &&
                  t("match.setup.players.statusField")}
                {selection.assignment === "bench" &&
                  t("match.setup.players.statusBench")}
                {selection.assignment === "unavailable" &&
                  t("match.setup.players.statusUnavailable")}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Start Button */}
      <div className="flex justify-center pb-8">
        <Button
          size="match"
          variant="default"
          className={cn(
            "touch-manipulation px-12 py-4 text-lg",
            canStart && "bg-field text-white hover:bg-field/90",
          )}
          disabled={!canStart}
          onClick={handleStart}
          aria-label={t("match.setup.startMatch")}
        >
          {t("match.setup.startMatch")}
        </Button>
      </div>

      {!canStart && (
        <p className="pb-4 text-center text-sm text-amber-400">
          {opponentName.trim().length === 0
            ? t("match.setup.validation.needOpponent")
            : t("match.setup.validation.needPlayers", {
                current: fieldCount,
                required: requiredOnField,
              })}
        </p>
      )}
    </div>
  );
}
