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
  preferredPositionId: string | undefined; // Player's preferred position
  assignedPositionId: string | undefined; // Position assigned on the field (only for field players)
  assignment: "field" | "bench" | "unavailable";
};

function buildInitialSelections(
  players: Player[],
  playersOnField: number,
  positions: Position[],
): PlayerSelection[] {
  const activePlayers = players.filter((p) => p.active);

  // Build position order map for sorting
  const positionOrder: Record<string, number> = {};
  positions.forEach((pos, index) => {
    positionOrder[pos.id] = index;
  });

  // Sort players by position order (players with positions first, then by position order)
  // Players without positions go to the end
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    const aPositionId = a.positionId ?? a.positionIds?.[0];
    const bPositionId = b.positionId ?? b.positionIds?.[0];

    const aOrder = aPositionId ? (positionOrder[aPositionId] ?? 999) : 999;
    const bOrder = bPositionId ? (positionOrder[bPositionId] ?? 999) : 999;

    return aOrder - bOrder;
  });

  // Get field positions (limited to playersOnField count)
  const fieldPositions = positions.slice(0, playersOnField);

  // Smart field selection: assign players to field positions based on preference
  // Map: playerId -> assigned position id
  const playerAssignments = new Map<string, string>();
  const assignedPositions = new Set<string>();

  // First pass: assign players to their preferred position if available
  for (const player of sortedPlayers) {
    if (playerAssignments.size >= playersOnField) break;

    const preferredPositionId = player.positionId ?? player.positionIds?.[0];
    if (
      preferredPositionId &&
      !assignedPositions.has(preferredPositionId) &&
      fieldPositions.some((p) => p.id === preferredPositionId)
    ) {
      playerAssignments.set(player.id, preferredPositionId);
      assignedPositions.add(preferredPositionId);
    }
  }

  // Second pass: fill remaining positions with remaining players
  const remainingPositions = fieldPositions.filter(
    (p) => !assignedPositions.has(p.id),
  );
  for (const player of sortedPlayers) {
    if (playerAssignments.size >= playersOnField) break;
    if (remainingPositions.length === 0) break;

    if (!playerAssignments.has(player.id)) {
      const position = remainingPositions.shift()!;
      playerAssignments.set(player.id, position.id);
      assignedPositions.add(position.id);
    }
  }

  // Build selections
  const selections = sortedPlayers.map((p) => ({
    playerId: p.id,
    name: p.name,
    number: p.number,
    preferredPositionId: p.positionId ?? p.positionIds?.[0],
    assignedPositionId: playerAssignments.get(p.id),
    assignment: playerAssignments.has(p.id)
      ? ("field" as const)
      : ("bench" as const),
  }));

  // Sort by assigned position order (field players first, sorted by position)
  // Then bench players (sorted by preferred position)
  return selections.sort((a, b) => {
    // Field players come first
    if (a.assignment === "field" && b.assignment !== "field") return -1;
    if (a.assignment !== "field" && b.assignment === "field") return 1;

    // Within same group, sort by position
    const aPositionId = a.assignedPositionId ?? a.preferredPositionId;
    const bPositionId = b.assignedPositionId ?? b.preferredPositionId;

    const aOrder = aPositionId ? (positionOrder[aPositionId] ?? 999) : 999;
    const bOrder = bPositionId ? (positionOrder[bPositionId] ?? 999) : 999;

    return aOrder - bOrder;
  });
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
      substitutionMode={team.settings.substitutionMode ?? "equal"}
      fixedSubstitutionIntervalMinutes={
        team.settings.fixedSubstitutionIntervalMinutes
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
  substitutionMode,
  fixedSubstitutionIntervalMinutes,
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
  substitutionMode: "equal" | "fixed";
  fixedSubstitutionIntervalMinutes: number | undefined;
  createMatch: (params: {
    teamId: string;
    opponentName: string;
    roster: MatchPlayer[];
    periodDurationMinutes: number;
    periodCount: number;
    playersOnField: number;
    sportProfileId?: string;
    usePositionAwareSubstitutions?: boolean;
    substitutionMode?: "equal" | "fixed";
    fixedSubstitutionIntervalMinutes?: number;
  }) => void;
  navigate: (path: string) => void;
}): React.ReactNode {
  const { t } = useTranslation();

  // Get positions for this sport
  const sportProfile = useMemo(
    () => getSportProfile(sportProfileId),
    [sportProfileId],
  );
  const positions: Position[] = useMemo(
    () => sportProfile?.players.positions ?? [],
    [sportProfile],
  );

  // State initialized directly from team (no effects needed)
  const [opponentName, setOpponentName] = useState("");
  const [periodDuration, setPeriodDuration] = useState(
    settings.periodDurationMinutes,
  );
  const [periodCount, setPeriodCount] = useState(settings.periodCount);
  const [playersOnField, setPlayersOnField] = useState(settings.playersOnField);
  const [selections, setSelections] = useState<PlayerSelection[]>(() =>
    buildInitialSelections(players, settings.playersOnField, positions),
  );
  // Which position slot is selected (to fill with a bench player)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Swipe handling refs
  const touchStartRef = useRef<{
    x: number;
    y: number;
    playerId: string;
  } | null>(null);
  const swipeThreshold = 50; // Minimum swipe distance in pixels
  const touchHandledRef = useRef(false); // Track if touch event handled the action

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

  // Build position order map for sorting
  const positionOrder = useMemo(() => {
    const order: Record<string, number> = {};
    positions.forEach((pos, index) => {
      order[pos.id] = index;
    });
    return order;
  }, [positions]);

  // Helper function to sort selections by position order
  const sortByPosition = useCallback(
    (selections: PlayerSelection[]): PlayerSelection[] => {
      return [...selections].sort((a, b) => {
        // Field players come first
        if (a.assignment === "field" && b.assignment !== "field") return -1;
        if (a.assignment !== "field" && b.assignment === "field") return 1;

        // Within same group, sort by position
        const aPositionId = a.assignedPositionId ?? a.preferredPositionId;
        const bPositionId = b.assignedPositionId ?? b.preferredPositionId;

        const aOrder = aPositionId ? (positionOrder[aPositionId] ?? 999) : 999;
        const bOrder = bPositionId ? (positionOrder[bPositionId] ?? 999) : 999;

        return aOrder - bOrder;
      });
    },
    [positionOrder],
  );

  // Click on a position slot
  const handleSlotClick = useCallback(
    (positionId: string) => {
      // Find player in this slot
      const playerInSlot = selections.find(
        (s) => s.assignment === "field" && s.assignedPositionId === positionId,
      );

      if (playerInSlot) {
        // Slot is filled - remove player from field
        setSelections((prev) =>
          sortByPosition(
            prev.map((s) =>
              s.playerId === playerInSlot.playerId
                ? {
                    ...s,
                    assignment: "bench" as const,
                    assignedPositionId: undefined,
                  }
                : s,
            ),
          ),
        );
        setSelectedSlotId(null);
      } else {
        // Slot is empty - select it to fill with a bench player
        setSelectedSlotId((prev) => (prev === positionId ? null : positionId));
      }
    },
    [selections, sortByPosition],
  );

  // Click on a bench player
  const handleBenchPlayerClick = useCallback(
    (playerId: string) => {
      if (selectedSlotId) {
        // Fill the selected slot with this player
        setSelections((prev) =>
          sortByPosition(
            prev.map((s) =>
              s.playerId === playerId
                ? {
                    ...s,
                    assignment: "field" as const,
                    assignedPositionId: selectedSlotId,
                  }
                : s,
            ),
          ),
        );
        setSelectedSlotId(null);
      }
    },
    [selectedSlotId, sortByPosition],
  );

  const handleToggleUnavailable = useCallback(
    (playerId: string) => {
      setSelections((prev) => {
        const updated = prev.map((s) => {
          if (s.playerId !== playerId) return s;
          if (s.assignment === "unavailable") {
            return {
              ...s,
              assignment: "bench" as const,
              assignedPositionId: undefined,
            };
          }
          return {
            ...s,
            assignment: "unavailable" as const,
            assignedPositionId: undefined,
          };
        });

        // Just sort, don't reassign other players' positions
        return sortByPosition(updated);
      });
    },
    [sortByPosition],
  );

  // Swipe handling for mobile - swipe left/right to toggle unavailable
  const handleTouchStart = useCallback(
    (playerId: string, e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          playerId,
        };
        touchHandledRef.current = false;
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (playerId: string, e: React.TouchEvent) => {
      if (
        !touchStartRef.current ||
        touchStartRef.current.playerId !== playerId
      ) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Mark that we handled this touch interaction
      touchHandledRef.current = true;

      // Check if it's a horizontal swipe (more horizontal than vertical)
      if (
        Math.abs(deltaX) > swipeThreshold &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        // Swipe detected - toggle unavailable
        handleToggleUnavailable(playerId);
        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }
      } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        // Tap detected (minimal movement) - handled by onClick for bench players
        // For bench players, if a slot is selected, fill it
        const player = selections.find((s) => s.playerId === playerId);
        if (player?.assignment === "bench" && selectedSlotId) {
          handleBenchPlayerClick(playerId);
        }
      }

      touchStartRef.current = null;
    },
    [
      handleToggleUnavailable,
      handleBenchPlayerClick,
      selections,
      selectedSlotId,
      swipeThreshold,
    ],
  );

  const handleStart = useCallback(() => {
    if (!canStart) return;

    const availableSelections = selections.filter(
      (s) => s.assignment !== "unavailable",
    );

    // Determine keeper automatically:
    // 1. If a field player has keeper position assigned, they are the keeper
    // 2. Otherwise, first field player becomes keeper
    const fieldSelections = availableSelections.filter(
      (s) => s.assignment === "field",
    );
    let keeperId: string | undefined;

    // Check if any field player has a keeper position
    for (const selection of fieldSelections) {
      const positionId =
        selection.assignedPositionId ?? selection.preferredPositionId;
      if (positionId) {
        const pos = positions.find((p) => p.id === positionId);
        if (pos?.isKeeper) {
          keeperId = selection.playerId;
          break;
        }
      }
    }

    // If no keeper position found, first field player becomes keeper
    if (!keeperId && fieldSelections.length > 0 && fieldSelections[0]) {
      keeperId = fieldSelections[0].playerId;
    }

    // Build roster with isKeeper flag
    const roster: MatchPlayer[] = availableSelections.map((s) => ({
      playerId: s.playerId,
      name: s.name,
      number: s.number,
      positionId: s.assignedPositionId ?? s.preferredPositionId,
      status: s.assignment as "field" | "bench",
      totalPlayTimeSeconds: 0,
      goals: 0,
      periods: [],
      isKeeper: s.playerId === keeperId,
    }));

    createMatch({
      teamId,
      opponentName: opponentName.trim(),
      roster,
      periodDurationMinutes: periodDuration,
      periodCount,
      playersOnField: requiredOnField,
      sportProfileId,
      usePositionAwareSubstitutions,
      substitutionMode,
      fixedSubstitutionIntervalMinutes,
    });

    navigate("/match/live");
  }, [
    canStart,
    selections,
    positions,
    opponentName,
    periodDuration,
    periodCount,
    requiredOnField,
    teamId,
    sportProfileId,
    usePositionAwareSubstitutions,
    substitutionMode,
    fixedSubstitutionIntervalMinutes,
    createMatch,
    navigate,
  ]);

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header with back button */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-1 flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("common.back")}
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
        </button>
        <div>
          <h1 className="text-2xl font-bold">{t("match.setup.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("match.setup.description")}
          </p>
        </div>
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

      {/* Position Slots (Field) */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t("match.setup.field.title")}
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
          {t("match.setup.field.instructions")}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {positions.slice(0, playersOnField).map((position) => {
            const playerInSlot = selections.find(
              (s) =>
                s.assignment === "field" &&
                s.assignedPositionId === position.id,
            );
            const isSelected = selectedSlotId === position.id;
            const isEmpty = !playerInSlot;

            return (
              <button
                key={position.id}
                type="button"
                onClick={() => handleSlotClick(position.id)}
                className={cn(
                  "flex min-h-20 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg border-2 p-2",
                  "text-center transition-colors select-none",
                  isEmpty &&
                    !isSelected &&
                    "border-dashed border-border bg-background",
                  isEmpty && isSelected && "border-primary bg-primary/10",
                  !isEmpty && "border-green-500 bg-field text-white",
                )}
                aria-label={t(position.name)}
              >
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-bold",
                    position.isKeeper && "bg-amber-500 text-black",
                    !position.isKeeper &&
                      isEmpty &&
                      "bg-muted text-muted-foreground",
                    !position.isKeeper && !isEmpty && "bg-white/20",
                  )}
                >
                  {position.isKeeper ? "GK" : t(position.abbreviation)}
                </span>
                {playerInSlot ? (
                  <>
                    {playerInSlot.number !== undefined && (
                      <span className="text-xs font-bold opacity-70">
                        #{playerInSlot.number}
                      </span>
                    )}
                    <span className="text-sm font-medium leading-tight">
                      {playerInSlot.name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isSelected
                      ? t("match.setup.field.selectPlayer")
                      : t("match.setup.field.empty")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bench Players */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {t("match.setup.bench.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("match.setup.bench.instructions")}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {selections
            .filter((s) => s.assignment !== "field")
            .map((selection) => {
              const preferredPosition = selection.preferredPositionId
                ? positions.find((p) => p.id === selection.preferredPositionId)
                : undefined;
              const canSelect =
                selectedSlotId && selection.assignment === "bench";

              return (
                <button
                  key={selection.playerId}
                  type="button"
                  onTouchStart={(e) => handleTouchStart(selection.playerId, e)}
                  onTouchEnd={(e) => handleTouchEnd(selection.playerId, e)}
                  onClick={() => {
                    if (touchHandledRef.current) {
                      touchHandledRef.current = false;
                      return;
                    }
                    if (canSelect) {
                      handleBenchPlayerClick(selection.playerId);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleToggleUnavailable(selection.playerId);
                  }}
                  className={cn(
                    "flex min-h-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg border-2 p-3",
                    "text-center transition-colors select-none",
                    selection.assignment === "bench" &&
                      !canSelect &&
                      "border-border bg-bench text-foreground",
                    selection.assignment === "bench" &&
                      canSelect &&
                      "border-primary bg-primary/10 text-foreground cursor-pointer",
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
                    {preferredPosition?.isKeeper && (
                      <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                        GK
                      </span>
                    )}
                    {preferredPosition && !preferredPosition.isKeeper && (
                      <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                        {t(preferredPosition.abbreviation)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium leading-tight">
                    {selection.name}
                  </span>
                  <span className="text-xs opacity-70">
                    {selection.assignment === "bench" &&
                      (canSelect
                        ? t("match.setup.bench.tapToSelect")
                        : t("match.setup.players.statusBench"))}
                    {selection.assignment === "unavailable" &&
                      t("match.setup.players.statusUnavailable")}
                  </span>
                </button>
              );
            })}
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
