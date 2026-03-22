import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useMatchStore } from "@/stores/matchStore";
import { Button } from "@/components/ui/button";
import { getSportProfile } from "@/engine/sport-profiles";
import type { MatchPlayer, Player } from "@/data/schemas";
import type { Position } from "@/data/schemas/sportProfile";

const PERIOD_DURATION_OPTIONS = [
  5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45,
] as const;

const PERIOD_COUNT_OPTIONS = [1, 2, 3, 4] as const;

// Generate player options from 4 to 11 (covers all sports)
function getPlayersOnFieldOptions(): Array<{ value: number; label: string }> {
  const options = [];
  for (let total = 4; total <= 11; total++) {
    const outfield = total - 1;
    options.push({ value: total, label: `${outfield}+1` });
  }
  return options;
}

type PlayerSelection = {
  playerId: string;
  name: string;
  number: number | undefined;
  positionId: string | undefined;
  assignment: "field" | "bench" | "unavailable";
};

function buildInitialSelections(
  players: Player[],
  playersOnField: number,
): PlayerSelection[] {
  const activePlayers = players.filter((p) => p.active);
  return activePlayers.map((p, index) => ({
    playerId: p.id,
    name: p.name,
    number: p.number,
    positionId: p.positionId,
    assignment:
      index < playersOnField ? ("field" as const) : ("bench" as const),
  }));
}

export function MatchSetupPage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { team, players, loading, initialize } = useTeamStore();
  const { createMatch } = useMatchStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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

  const activePlayers = players.filter((p: Player) => p.active);
  if (activePlayers.length < 2) {
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
    <MatchSetupForm
      teamId={team.id}
      sportProfileId={team.sportProfileId}
      players={players}
      settings={team.settings}
      usePositionAwareSubstitutions={
        team.settings.usePositionAwareSubstitutions ?? false
      }
      createMatch={createMatch}
      navigate={navigate}
    />
  );
}

function MatchSetupForm({
  teamId,
  sportProfileId,
  players,
  settings,
  usePositionAwareSubstitutions,
  createMatch,
  navigate,
}: {
  teamId: string;
  sportProfileId: string;
  players: Player[];
  settings: {
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
  };
  usePositionAwareSubstitutions: boolean;
  createMatch: (params: {
    teamId: string;
    opponentName: string;
    roster: MatchPlayer[];
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
    sportProfileId?: string;
    usePositionAwareSubstitutions?: boolean;
  }) => void;
  navigate: (path: string) => void;
}): React.ReactNode {
  const { t } = useTranslation();

  // Get positions for this sport
  const sportProfile = useMemo(
    () => getSportProfile(sportProfileId),
    [sportProfileId],
  );
  const positions: Position[] = sportProfile?.players.positions ?? [];

  // Check if this sport has a keeper position
  const sportHasKeeper = useMemo(
    () => positions.some((p) => p.isKeeper),
    [positions],
  );

  // State initialized directly from team (no effects needed)
  const [opponentName, setOpponentName] = useState("");
  const [periodDuration, setPeriodDuration] = useState(
    settings.periodDurationMinutes,
  );
  const [periodCount, setPeriodCount] = useState(settings.periodCount);
  const [playersOnField, setPlayersOnField] = useState(settings.playersOnField);
  const [selections, setSelections] = useState<PlayerSelection[]>(() =>
    buildInitialSelections(players, settings.playersOnField),
  );
  const [selectedKeeperId, setSelectedKeeperId] = useState<string | undefined>(
    () => {
      // Pre-select keeper if a player has a keeper position
      const activePlayers = players.filter((p) => p.active);
      for (const player of activePlayers) {
        if (player.positionId) {
          const pos = positions.find((p) => p.id === player.positionId);
          if (pos?.isKeeper) {
            return player.id;
          }
        }
      }
      return undefined;
    },
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
      setSelections((prev) => {
        const updated = prev.map((s) => {
          if (s.playerId !== playerId) return s;
          if (s.assignment === "unavailable") return s;

          if (s.assignment === "field") {
            return { ...s, assignment: "bench" as const };
          }
          const currentFieldCount = prev.filter(
            (ps) => ps.assignment === "field" && ps.playerId !== playerId,
          ).length;
          if (currentFieldCount < requiredOnField) {
            return { ...s, assignment: "field" as const };
          }
          return s;
        });

        // Clear keeper selection if keeper moved off field
        const playerSelection = updated.find((s) => s.playerId === playerId);
        if (
          selectedKeeperId === playerId &&
          playerSelection?.assignment !== "field"
        ) {
          setSelectedKeeperId(undefined);
        }

        return updated;
      });
    },
    [requiredOnField, selectedKeeperId],
  );

  const handleToggleUnavailable = useCallback(
    (playerId: string) => {
      // Clear keeper selection if this player becomes unavailable
      if (selectedKeeperId === playerId) {
        setSelectedKeeperId(undefined);
      }

      setSelections((prev) =>
        prev.map((s) => {
          if (s.playerId !== playerId) return s;
          if (s.assignment === "unavailable") {
            return { ...s, assignment: "bench" };
          }
          return { ...s, assignment: "unavailable" };
        }),
      );
    },
    [selectedKeeperId],
  );

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
      .map((s) => {
        // Use selectedKeeperId if set, otherwise fall back to position-based detection
        const isKeeper =
          selectedKeeperId === s.playerId ||
          (selectedKeeperId === undefined &&
            s.positionId !== undefined &&
            (positions.find((p) => p.id === s.positionId)?.isKeeper ?? false));

        return {
          playerId: s.playerId,
          name: s.name,
          number: s.number,
          positionId: s.positionId,
          status: s.assignment as "field" | "bench",
          totalPlayTimeSeconds: 0,
          goals: 0,
          periods: [],
          isKeeper,
        };
      });

    createMatch({
      teamId,
      opponentName: opponentName.trim(),
      roster,
      periodDurationMinutes: periodDuration,
      periodCount,
      playersOnField: requiredOnField,
      sportProfileId,
      usePositionAwareSubstitutions,
    });

    navigate("/match/live");
  }, [
    canStart,
    selections,
    positions,
    selectedKeeperId,
    opponentName,
    periodDuration,
    periodCount,
    requiredOnField,
    teamId,
    sportProfileId,
    usePositionAwareSubstitutions,
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
            <label
              htmlFor="setup-period-count"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("team.edit.settings.periodCount")}
            </label>
            <select
              id="setup-period-count"
              value={periodCount}
              onChange={(e) => setPeriodCount(parseInt(e.target.value, 10))}
              className={cn(
                "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
                "text-base text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            >
              {PERIOD_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
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
              {getPlayersOnFieldOptions().map((opt) => (
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
          {selections.map((selection) => {
            const playerPosition = selection.positionId
              ? positions.find((p) => p.id === selection.positionId)
              : undefined;

            return (
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
                <div className="flex items-center gap-1">
                  {selection.number !== undefined && (
                    <span className="text-xs font-bold opacity-70">
                      #{selection.number}
                    </span>
                  )}
                  {playerPosition?.isKeeper && (
                    <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                      GK
                    </span>
                  )}
                  {playerPosition && !playerPosition.isKeeper && (
                    <span
                      className={cn(
                        "rounded px-1 text-[10px] font-medium",
                        selection.assignment === "field"
                          ? "bg-white/20"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t(playerPosition.abbreviation)}
                    </span>
                  )}
                </div>
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
            );
          })}
        </div>
      </section>

      {/* Keeper Selection - only for sports with keepers */}
      {sportHasKeeper && (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-black">
              GK
            </span>
            <h2 className="text-lg font-semibold">
              {t("match.setup.keeper.title")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("match.setup.keeper.description")}
          </p>
          <div className="flex flex-wrap gap-2">
            {selections
              .filter((s) => s.assignment === "field")
              .map((selection) => {
                const isSelected = selectedKeeperId === selection.playerId;
                return (
                  <button
                    key={selection.playerId}
                    type="button"
                    onClick={() =>
                      setSelectedKeeperId(
                        isSelected ? undefined : selection.playerId,
                      )
                    }
                    className={cn(
                      "flex min-h-12 touch-manipulation items-center gap-2 rounded-lg border-2 px-4 py-2",
                      "text-sm font-medium transition-colors",
                      isSelected
                        ? "border-amber-500 bg-amber-500/20 text-amber-300"
                        : "border-border bg-background text-foreground hover:border-amber-500/50",
                    )}
                  >
                    {selection.number !== undefined && (
                      <span className="font-bold opacity-70">
                        #{selection.number}
                      </span>
                    )}
                    <span>{selection.name}</span>
                    {isSelected && (
                      <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                        GK
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
          {selectedKeeperId === undefined && (
            <p className="text-xs text-amber-400">
              {t("match.setup.keeper.noSelection")}
            </p>
          )}
        </section>
      )}

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
