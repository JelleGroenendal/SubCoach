import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMatchStore } from "@/stores/matchStore";
import { useTeamStore } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import { formatTime, isPeriodFinished } from "@/engine/timer/matchTimer";
import { getActivePenalties } from "@/engine/timer/penaltyTimer";
import { requestWakeLock } from "@/lib/pwa";
import { getSportProfile } from "@/engine/sport-profiles";
import type { MatchPlayer } from "@/data/schemas";

type PlayerAction = "penalty" | "redCard" | "injury";
type MobileTab = "field" | "bench";

export function MatchLivePage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { team } = useTeamStore();
  const sportProfile = useMemo(
    () => (team ? getSportProfile(team.sportProfileId) : undefined),
    [team],
  );

  // Get the default penalty duration from the sport profile (e.g., 2 minutes for handball)
  const defaultPenaltyDuration = useMemo((): number => {
    const timePenalties = sportProfile?.penalties.timePenalties;
    if (!timePenalties || timePenalties.length === 0) return 120;
    const firstPenalty = timePenalties[0];
    return firstPenalty ? firstPenalty.durationSeconds : 120;
  }, [sportProfile]);

  const {
    match,
    selectedPlayerId,
    substitutionPlan,
    showUndo,
    lastAction,
    loadMatch,
    startTimer,
    pauseTimer,
    updateElapsed,
    startNextPeriod,
    selectPlayer,
    executeSubstitution,
    registerGoal,
    registerOpponentGoal,
    registerPenalty,
    registerRedCard,
    registerInjury,
    endPenalty,
    undoLastAction,
    dismissUndo,
    endMatch,
    autoSave,
  } = useMatchStore();

  const [actionMenuPlayerId, setActionMenuPlayerId] = useState<
    string | undefined
  >(undefined);
  const [goalScorerMode, setGoalScorerMode] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("field");
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressTriggeredRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const lastTickTimeRef = useRef<number>(0);

  // Load match if not present
  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Wake lock
  useEffect(() => {
    const release = requestWakeLock();
    return () => {
      release?.();
    };
  }, []);

  // Timer tick (1s interval when playing)
  useEffect(() => {
    if (match?.status === "playing") {
      lastTickTimeRef.current = Date.now();
      tickRef.current = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTickTimeRef.current) / 1000;
        lastTickTimeRef.current = now;
        const currentMatch = useMatchStore.getState().match;
        if (currentMatch && currentMatch.status === "playing") {
          updateElapsed(currentMatch.elapsedSeconds + delta);
        }
      }, 1000);
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = undefined;
      }
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = undefined;
      }
    };
  }, [match?.status, updateElapsed]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      autoSave();
    }, 30000);
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [autoSave]);

  // Halftime detection
  useEffect(() => {
    if (!match || match.status !== "playing") return;
    const periodSeconds = match.periodDurationMinutes * 60;
    if (isPeriodFinished(match.elapsedSeconds, periodSeconds)) {
      pauseTimer();
    }
  }, [match, pauseTimer]);

  const periodSeconds = useMemo(
    () => (match ? match.periodDurationMinutes * 60 : 0),
    [match],
  );

  const periodFinished = useMemo(
    () =>
      match ? isPeriodFinished(match.elapsedSeconds, periodSeconds) : false,
    [match, periodSeconds],
  );

  const isLastPeriod = useMemo(
    () => (match ? match.currentPeriod >= match.periodCount : false),
    [match],
  );

  const activePenalties = useMemo(
    () => (match ? getActivePenalties(match.events, match.elapsedSeconds) : []),
    [match],
  );

  // Check if penalties have expired and end them
  useEffect(() => {
    if (!match) return;
    const allPenalties = getActivePenalties(match.events, match.elapsedSeconds);
    for (const penalty of allPenalties) {
      if (penalty.remainingSeconds <= 0) {
        endPenalty(penalty.penaltyId);
      }
    }
  }, [match, endPenalty]);

  const fieldPlayers = useMemo(
    () => (match ? match.roster.filter((p) => p.status === "field") : []),
    [match],
  );

  const benchPlayers = useMemo(
    () => (match ? match.roster.filter((p) => p.status === "bench") : []),
    [match],
  );

  const penaltyPlayers = useMemo(
    () => (match ? match.roster.filter((p) => p.status === "penalty") : []),
    [match],
  );

  const nextSuggestion = useMemo(() => {
    if (substitutionPlan.suggestions.length === 0) return undefined;
    return substitutionPlan.suggestions[0];
  }, [substitutionPlan]);

  const getPlayerPlayTime = useCallback(
    (player: MatchPlayer): number => {
      if (!match) return player.totalPlayTimeSeconds;
      return player.periods.reduce((sum, per) => {
        const outAt = per.outAt ?? match.elapsedSeconds;
        return sum + (outAt - per.inAt);
      }, 0);
    },
    [match],
  );

  // Substitution logic
  const handleFieldPlayerTap = useCallback(
    (playerId: string) => {
      if (goalScorerMode) {
        registerGoal(playerId);
        setGoalScorerMode(false);
        return;
      }

      if (selectedPlayerId && selectedPlayerId !== playerId) {
        // A bench player was selected, now tapping a field player -> substitute
        const selectedOnBench = benchPlayers.find(
          (p) => p.playerId === selectedPlayerId,
        );
        if (selectedOnBench) {
          executeSubstitution(selectedPlayerId, playerId);
          return;
        }
      }
      // Select/deselect this field player
      selectPlayer(selectedPlayerId === playerId ? undefined : playerId);
      setActionMenuPlayerId(undefined);
    },
    [
      selectedPlayerId,
      goalScorerMode,
      benchPlayers,
      selectPlayer,
      executeSubstitution,
      registerGoal,
    ],
  );

  const handleBenchPlayerTap = useCallback(
    (playerId: string) => {
      if (goalScorerMode) {
        setGoalScorerMode(false);
        return;
      }

      if (selectedPlayerId && selectedPlayerId !== playerId) {
        // A field player was selected, now tapping a bench player -> substitute
        const selectedOnField = fieldPlayers.find(
          (p) => p.playerId === selectedPlayerId,
        );
        if (selectedOnField) {
          executeSubstitution(playerId, selectedPlayerId);
          return;
        }
      }
      // Select/deselect this bench player
      selectPlayer(selectedPlayerId === playerId ? undefined : playerId);
    },
    [
      selectedPlayerId,
      fieldPlayers,
      selectPlayer,
      executeSubstitution,
      goalScorerMode,
    ],
  );

  // Long-press for field player actions
  const handleFieldPointerDown = useCallback((playerId: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setActionMenuPlayerId((prev) =>
        prev === playerId ? undefined : playerId,
      );
    }, 600);
  }, []);

  const handleFieldPointerUp = useCallback(
    (playerId: string) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = undefined;
      }
      if (!longPressTriggeredRef.current) {
        handleFieldPlayerTap(playerId);
      }
    },
    [handleFieldPlayerTap],
  );

  const handleFieldPointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  }, []);

  const handlePlayerAction = useCallback(
    (playerId: string, action: PlayerAction) => {
      setActionMenuPlayerId(undefined);
      selectPlayer(undefined);
      switch (action) {
        case "penalty":
          registerPenalty(playerId, defaultPenaltyDuration);
          break;
        case "redCard":
          registerRedCard(playerId, defaultPenaltyDuration);
          break;
        case "injury":
          registerInjury(playerId);
          break;
      }
    },
    [
      selectPlayer,
      registerPenalty,
      registerRedCard,
      registerInjury,
      defaultPenaltyDuration,
    ],
  );

  const handleHomeGoal = useCallback(() => {
    setGoalScorerMode(true);
    setActionMenuPlayerId(undefined);
    selectPlayer(undefined);
  }, [selectPlayer]);

  const handleTimerTap = useCallback(() => {
    if (!match) return;
    if (match.status === "setup" || match.status === "paused") {
      if (periodFinished && !isLastPeriod) {
        startNextPeriod();
      } else {
        startTimer();
      }
    } else if (match.status === "playing") {
      pauseTimer();
    }
  }, [
    match,
    periodFinished,
    isLastPeriod,
    startTimer,
    pauseTimer,
    startNextPeriod,
  ]);

  const handleEndMatch = useCallback(() => {
    endMatch();
    navigate("/match/summary");
  }, [endMatch, navigate]);

  const getUndoText = useCallback((): string => {
    if (!lastAction) return "";
    const event = lastAction.event;
    switch (event.type) {
      case "substitution": {
        const playerIn = match?.roster.find(
          (p) => p.playerId === event.playerInId,
        );
        const playerOut = match?.roster.find(
          (p) => p.playerId === event.playerOutId,
        );
        return t("match.live.undo.substitution", {
          playerIn: playerIn?.name ?? "?",
          playerOut: playerOut?.name ?? "?",
        });
      }
      case "goal": {
        const scorer = match?.roster.find((p) => p.playerId === event.playerId);
        return t("match.live.undo.goal", { player: scorer?.name ?? "?" });
      }
      case "opponentGoal":
        return t("match.live.undo.opponentGoal");
      case "penalty": {
        const penalized = match?.roster.find(
          (p) => p.playerId === event.playerId,
        );
        return t("match.live.undo.penalty", { player: penalized?.name ?? "?" });
      }
      case "redCard": {
        const carded = match?.roster.find((p) => p.playerId === event.playerId);
        return t("match.live.undo.redCard", { player: carded?.name ?? "?" });
      }
      case "injury": {
        const injured = match?.roster.find(
          (p) => p.playerId === event.playerId,
        );
        return t("match.live.undo.injury", { player: injured?.name ?? "?" });
      }
      default:
        return "";
    }
  }, [lastAction, match, t]);

  // Quick substitute handler for suggestion
  const handleQuickSubstitute = useCallback(() => {
    if (!nextSuggestion) return;
    executeSubstitution(nextSuggestion.playerInId, nextSuggestion.playerOutId);
  }, [nextSuggestion, executeSubstitution]);

  // Determine which tab should be active based on selection
  // When a field player is selected, show bench (and vice versa) to make substitution easier
  const effectiveMobileTab = useMemo((): MobileTab => {
    if (selectedPlayerId) {
      const isFieldPlayer = fieldPlayers.some(
        (p) => p.playerId === selectedPlayerId,
      );
      return isFieldPlayer ? "bench" : "field";
    }
    return mobileTab;
  }, [selectedPlayerId, fieldPlayers, mobileTab]);

  // No match loaded
  if (!match) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Timer display value
  const displayTime = formatTime(Math.floor(match.elapsedSeconds));
  const periodTimeDisplay = formatTime(
    Math.max(0, Math.floor(periodSeconds - match.elapsedSeconds)),
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Bar - Compact on mobile */}
      <div className="flex flex-col border-b border-border">
        {/* Row 1: Timer + Score */}
        <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
          {/* Timer */}
          <button
            type="button"
            onClick={handleTimerTap}
            className={cn(
              "flex min-h-12 touch-manipulation flex-col items-center rounded-lg px-3 py-1 sm:px-4",
              "transition-colors",
              match.status === "playing" && "bg-field/20",
              match.status === "paused" && "bg-amber-900/30",
              match.status === "setup" && "bg-primary/10",
            )}
            aria-label={t("match.live.timer.toggle")}
          >
            <span className="text-2xl font-bold tabular-nums leading-tight text-foreground sm:text-3xl lg:text-4xl">
              {displayTime}
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">
              {match.status === "playing" && t("match.live.timer.running")}
              {match.status === "paused" &&
                !periodFinished &&
                t("match.live.timer.paused")}
              {match.status === "setup" && t("match.live.timer.tapToStart")}
              {periodFinished &&
                !isLastPeriod &&
                t("match.live.timer.startNextPeriod", {
                  period: match.currentPeriod + 1,
                })}
              {periodFinished &&
                isLastPeriod &&
                t("match.live.timer.matchEnded")}
            </span>
          </button>

          {/* Score - More compact */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleHomeGoal}
              className={cn(
                "min-h-10 min-w-10 touch-manipulation rounded-lg px-1.5 sm:min-h-12 sm:min-w-12 sm:px-2",
                "text-xs font-medium text-green-400",
                "transition-colors hover:bg-green-900/30",
                goalScorerMode && "bg-green-900/50 ring-2 ring-green-400",
              )}
              aria-label={t("match.live.score.addHome")}
            >
              +1
            </button>
            <span className="min-w-8 text-center text-2xl font-bold tabular-nums text-foreground sm:min-w-10 sm:text-3xl lg:text-4xl">
              {match.homeScore}
            </span>
            <span className="text-xl font-light text-muted-foreground sm:text-2xl">
              -
            </span>
            <span className="min-w-8 text-center text-2xl font-bold tabular-nums text-foreground sm:min-w-10 sm:text-3xl lg:text-4xl">
              {match.awayScore}
            </span>
            <button
              type="button"
              onClick={() => registerOpponentGoal()}
              className={cn(
                "min-h-10 min-w-10 touch-manipulation rounded-lg px-1.5 sm:min-h-12 sm:min-w-12 sm:px-2",
                "text-xs font-medium text-red-400",
                "transition-colors hover:bg-red-900/30",
              )}
              aria-label={t("match.live.score.addAway")}
            >
              +1
            </button>
          </div>

          {/* Period + Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                {t("match.live.period", { period: match.currentPeriod })}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground sm:text-xs">
                {periodTimeDisplay}
              </span>
            </div>

            {/* Undo - Hidden on smallest screens, shown in bottom bar instead */}
            <button
              type="button"
              onClick={undoLastAction}
              disabled={!lastAction}
              className={cn(
                "hidden min-h-12 min-w-12 touch-manipulation rounded-lg px-2 sm:flex",
                "items-center justify-center text-sm font-medium text-muted-foreground",
                "transition-colors hover:bg-accent",
                !lastAction && "opacity-30",
              )}
              aria-label={t("match.live.undo.button")}
            >
              ↩
            </button>

            {/* Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                className={cn(
                  "min-h-10 min-w-10 touch-manipulation rounded-lg px-1.5 sm:min-h-12 sm:min-w-12 sm:px-2",
                  "text-lg text-muted-foreground",
                  "transition-colors hover:bg-accent",
                )}
                aria-label={t("match.live.menu.button")}
              >
                &#8942;
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowEndConfirm(true);
                    }}
                    className={cn(
                      "flex min-h-12 w-full touch-manipulation items-center rounded-md px-3 py-2",
                      "text-sm font-medium text-destructive",
                      "transition-colors hover:bg-destructive/10",
                    )}
                  >
                    {t("match.live.menu.endMatch")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goal scorer overlay */}
      {goalScorerMode && (
        <div className="flex items-center justify-between border-b border-amber-700 bg-amber-900/30 px-4 py-2">
          <span className="text-sm font-medium text-amber-300">
            {t("match.live.goal.selectScorer")}
          </span>
          <button
            type="button"
            onClick={() => setGoalScorerMode(false)}
            className={cn(
              "min-h-12 touch-manipulation rounded-md px-4 py-2",
              "text-sm text-amber-300",
              "transition-colors hover:bg-amber-900/50",
            )}
            aria-label={t("common.cancel")}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Selection indicator bar - shows when player selected */}
      {selectedPlayerId && (
        <div className="flex items-center justify-between border-b border-orange-700 bg-orange-900/30 px-3 py-2">
          <span className="text-sm font-medium text-orange-300">
            {t("match.live.selection.selected", {
              name:
                match.roster.find((p) => p.playerId === selectedPlayerId)
                  ?.name ?? "?",
            })}
          </span>
          <button
            type="button"
            onClick={() => selectPlayer(undefined)}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
              "text-sm text-orange-300",
              "transition-colors hover:bg-orange-900/50",
            )}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Mobile Tab Bar - Only visible on small screens */}
      <div className="flex border-b border-border sm:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("field")}
          className={cn(
            "flex-1 touch-manipulation py-3 text-center text-sm font-medium",
            effectiveMobileTab === "field"
              ? "border-b-2 border-green-500 text-green-400"
              : "text-muted-foreground",
          )}
        >
          {t("match.live.field.title")} ({fieldPlayers.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("bench")}
          className={cn(
            "flex-1 touch-manipulation py-3 text-center text-sm font-medium",
            effectiveMobileTab === "bench"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground",
          )}
        >
          {t("match.live.bench.title")} ({benchPlayers.length})
        </button>
      </div>

      {/* Main Area: Field + Bench - Split on tablet+, tabs on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* Field Players - Always visible on tablet+, tab-controlled on mobile */}
        <div
          className={cn(
            "flex flex-col border-r border-border",
            "w-full sm:w-[55%] lg:w-[60%]",
            effectiveMobileTab !== "field" && "hidden sm:flex",
          )}
        >
          {/* Header - Hidden on mobile (using tabs) */}
          <div className="hidden items-center justify-between px-3 py-2 sm:flex">
            <h2 className="text-sm font-semibold text-green-400">
              {t("match.live.field.title")} ({fieldPlayers.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {fieldPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.playerId;
                const isSuggestedOut =
                  nextSuggestion?.playerOutId === player.playerId;
                const showActions = actionMenuPlayerId === player.playerId;
                const playTimeSeconds = getPlayerPlayTime(player);

                return (
                  <div key={player.playerId} className="relative">
                    <button
                      type="button"
                      onPointerDown={() =>
                        handleFieldPointerDown(player.playerId)
                      }
                      onPointerUp={() => handleFieldPointerUp(player.playerId)}
                      onPointerLeave={handleFieldPointerLeave}
                      className={cn(
                        "flex min-h-20 w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl p-2 sm:min-h-16 sm:rounded-lg",
                        "text-center transition-all select-none",
                        "bg-field text-white",
                        isSelected && "ring-4 ring-orange-400",
                        isSuggestedOut &&
                          !isSelected &&
                          "ring-2 ring-amber-500/60",
                        goalScorerMode && "ring-2 ring-amber-400/50",
                      )}
                      aria-label={t("match.live.field.playerAction", {
                        name: player.name,
                      })}
                    >
                      <div className="flex items-center gap-1">
                        {player.number !== undefined && (
                          <span className="text-xs font-bold opacity-70">
                            #{player.number}
                          </span>
                        )}
                        {player.goals > 0 && (
                          <span className="text-xs">
                            {"⚽".repeat(Math.min(player.goals, 5))}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-semibold leading-tight sm:text-base lg:text-lg">
                        {player.name}
                      </span>
                      <span className="text-xs tabular-nums opacity-70">
                        {formatTime(Math.floor(playTimeSeconds))}
                      </span>
                    </button>

                    {/* Action menu button - Larger on mobile */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuPlayerId(
                          actionMenuPlayerId === player.playerId
                            ? undefined
                            : player.playerId,
                        );
                      }}
                      className={cn(
                        "absolute right-1 top-1 flex h-8 w-8 touch-manipulation items-center justify-center sm:h-6 sm:w-6",
                        "rounded-full bg-black/20 text-sm text-white/80 sm:bg-transparent sm:text-xs sm:text-white/60",
                        "transition-colors hover:bg-white/20",
                      )}
                      aria-label={t("match.live.field.moreActions", {
                        name: player.name,
                      })}
                    >
                      &#8942;
                    </button>

                    {/* Inline action menu - Full width on mobile */}
                    {showActions && (
                      <div className="absolute left-0 top-full z-40 mt-1 flex w-full min-w-40 flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayerAction(player.playerId, "penalty")
                          }
                          className={cn(
                            "min-h-12 touch-manipulation rounded-md px-3 py-2",
                            "text-left text-sm font-medium text-amber-400",
                            "transition-colors hover:bg-amber-900/30",
                          )}
                        >
                          {t("match.live.actions.penalty")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayerAction(player.playerId, "redCard")
                          }
                          className={cn(
                            "min-h-12 touch-manipulation rounded-md px-3 py-2",
                            "text-left text-sm font-medium text-red-400",
                            "transition-colors hover:bg-red-900/30",
                          )}
                        >
                          {t("match.live.actions.redCard")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayerAction(player.playerId, "injury")
                          }
                          className={cn(
                            "min-h-12 touch-manipulation rounded-md px-3 py-2",
                            "text-left text-sm font-medium text-orange-400",
                            "transition-colors hover:bg-orange-900/30",
                          )}
                        >
                          {t("match.live.actions.injury")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Penalty players shown in field area with penalty styling */}
              {penaltyPlayers.map((player) => {
                const penalty = activePenalties.find(
                  (p) => p.playerId === player.playerId,
                );
                return (
                  <div
                    key={player.playerId}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl p-2 sm:min-h-16 sm:rounded-lg",
                      "bg-penalty text-white opacity-80",
                    )}
                  >
                    {player.number !== undefined && (
                      <span className="text-xs font-bold opacity-70">
                        #{player.number}
                      </span>
                    )}
                    <span className="text-base font-semibold leading-tight">
                      {player.name}
                    </span>
                    {penalty && (
                      <span className="text-xs font-bold tabular-nums text-red-300">
                        {t("match.live.field.penaltyRemaining", {
                          time: formatTime(
                            Math.floor(penalty.remainingSeconds),
                          ),
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bench Players - Always visible on tablet+, tab-controlled on mobile */}
        <div
          className={cn(
            "flex flex-col",
            "w-full sm:w-[45%] lg:w-[40%]",
            effectiveMobileTab !== "bench" && "hidden sm:flex",
          )}
        >
          {/* Header - Hidden on mobile (using tabs) */}
          <div className="hidden items-center justify-between px-3 py-2 sm:flex">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("match.live.bench.title")} ({benchPlayers.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-2">
              {benchPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.playerId;
                const isSuggestedIn =
                  nextSuggestion?.playerInId === player.playerId;
                const playTimeSeconds = getPlayerPlayTime(player);

                return (
                  <button
                    key={player.playerId}
                    type="button"
                    onClick={() => handleBenchPlayerTap(player.playerId)}
                    className={cn(
                      "flex min-h-16 w-full touch-manipulation items-center gap-3 rounded-xl p-3 sm:min-h-14 sm:rounded-lg",
                      "text-left transition-all select-none",
                      "bg-bench text-foreground",
                      isSelected && "ring-4 ring-orange-400",
                      isSuggestedIn &&
                        !isSelected &&
                        "ring-2 ring-amber-500/60",
                    )}
                    aria-label={t("match.live.bench.selectPlayer", {
                      name: player.name,
                    })}
                  >
                    {player.number !== undefined && (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground sm:h-8 sm:w-8 sm:rounded-md">
                        {player.number}
                      </span>
                    )}
                    <div className="flex flex-1 flex-col">
                      <span className="text-base font-medium leading-tight">
                        {player.name}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatTime(Math.floor(playTimeSeconds))}
                      </span>
                    </div>
                    {player.goals > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {"⚽".repeat(Math.min(player.goals, 5))}
                      </span>
                    )}
                  </button>
                );
              })}

              {benchPlayers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("match.live.bench.empty")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - More info on mobile */}
      <div className="flex flex-col border-t border-border">
        {/* Active penalties */}
        {activePenalties.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-penalty/10 px-3 py-1.5 sm:gap-4">
            <span className="text-xs font-semibold text-red-400">
              {t("match.live.penalties.title")}
            </span>
            {activePenalties.map((penalty) => {
              const player = match.roster.find(
                (p) => p.playerId === penalty.playerId,
              );
              return (
                <span
                  key={penalty.penaltyId}
                  className="text-xs tabular-nums text-red-300"
                >
                  {player?.name}:{" "}
                  {formatTime(Math.floor(penalty.remainingSeconds))}
                </span>
              );
            })}
          </div>
        )}

        {/* Quick substitute button - When suggestion available */}
        {nextSuggestion && (
          <button
            type="button"
            onClick={handleQuickSubstitute}
            className={cn(
              "flex min-h-12 w-full touch-manipulation items-center justify-between gap-2 border-b border-border bg-amber-900/20 px-3 py-2",
              "transition-colors hover:bg-amber-900/30",
            )}
          >
            <span className="text-sm text-amber-400">
              {t("match.live.suggestion.next", {
                playerIn:
                  match.roster.find(
                    (p) => p.playerId === nextSuggestion.playerInId,
                  )?.name ?? "?",
                playerOut:
                  match.roster.find(
                    (p) => p.playerId === nextSuggestion.playerOutId,
                  )?.name ?? "?",
                time: formatTime(nextSuggestion.timestamp),
              })}
            </span>
            <span className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
              {t("match.live.suggestion.execute")}
            </span>
          </button>
        )}

        {/* Warnings */}
        {substitutionPlan.warnings.length > 0 && (
          <div className="px-3 py-1">
            {substitutionPlan.warnings.map((warning, i) => (
              <span key={i} className="text-xs text-amber-500">
                {t(warning)}
              </span>
            ))}
          </div>
        )}

        {/* Mobile undo button */}
        {lastAction && (
          <button
            type="button"
            onClick={undoLastAction}
            className={cn(
              "flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 border-t border-border bg-muted/50 px-3 py-2 sm:hidden",
              "text-sm text-muted-foreground transition-colors hover:bg-muted",
            )}
          >
            <span>↩</span>
            <span>{t("match.live.undo.button")}</span>
          </button>
        )}
      </div>

      {/* Undo Snackbar */}
      {showUndo && lastAction && (
        <div
          className={cn(
            "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3",
            "rounded-lg border border-border bg-card px-4 py-3 shadow-xl",
          )}
        >
          <span className="text-sm text-foreground">{getUndoText()}</span>
          <button
            type="button"
            onClick={undoLastAction}
            className={cn(
              "min-h-12 touch-manipulation rounded-md bg-primary px-4 py-2",
              "text-sm font-semibold text-primary-foreground",
              "transition-colors hover:bg-primary/90",
            )}
            aria-label={t("match.live.undo.action")}
          >
            {t("match.live.undo.action")}
          </button>
          <button
            type="button"
            onClick={dismissUndo}
            className={cn(
              "min-h-12 min-w-12 touch-manipulation rounded-md px-3 py-2",
              "text-sm text-muted-foreground",
              "transition-colors hover:bg-accent",
            )}
            aria-label={t("common.dismiss")}
          >
            ✕
          </button>
        </div>
      )}

      {/* End Match Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 flex max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">
              {t("match.live.endMatch.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("match.live.endMatch.confirm")}
            </p>
            <div className="flex gap-3">
              <Button
                size="xl"
                variant="ghost"
                className="flex-1 touch-manipulation"
                onClick={() => setShowEndConfirm(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="xl"
                variant="destructive"
                className="flex-1 touch-manipulation"
                onClick={handleEndMatch}
              >
                {t("match.live.endMatch.confirm_button")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss overlay for action menu and general menu */}
      {(actionMenuPlayerId !== undefined || showMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setActionMenuPlayerId(undefined);
            setShowMenu(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
