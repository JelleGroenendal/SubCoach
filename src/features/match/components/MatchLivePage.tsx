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

  const [goalScorerMode, setGoalScorerMode] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("field");
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

  // Player lists
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

  // Players who are out (injured or red-carded) - can be replaced
  const outPlayers = useMemo(
    () =>
      match
        ? match.roster.filter(
            (p) => p.status === "injured" || p.status === "redCard",
          )
        : [],
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

  // Get selected player info
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId || !match) return undefined;
    return match.roster.find((p) => p.playerId === selectedPlayerId);
  }, [selectedPlayerId, match]);

  const isSelectedOnField = selectedPlayer?.status === "field";
  const isSelectedOnBench = selectedPlayer?.status === "bench";

  // Handle field player tap - select for substitution or goal
  const handleFieldPlayerTap = useCallback(
    (playerId: string) => {
      if (goalScorerMode) {
        registerGoal(playerId);
        setGoalScorerMode(false);
        return;
      }

      // If a bench player is selected, execute substitution
      if (isSelectedOnBench && selectedPlayerId) {
        executeSubstitution(selectedPlayerId, playerId);
        return;
      }

      // Toggle selection
      selectPlayer(selectedPlayerId === playerId ? undefined : playerId);
    },
    [
      selectedPlayerId,
      goalScorerMode,
      isSelectedOnBench,
      selectPlayer,
      executeSubstitution,
      registerGoal,
    ],
  );

  // Handle bench player tap - select for substitution
  const handleBenchPlayerTap = useCallback(
    (playerId: string) => {
      if (goalScorerMode) {
        setGoalScorerMode(false);
        return;
      }

      // If a field player is selected, execute substitution
      if (isSelectedOnField && selectedPlayerId) {
        executeSubstitution(playerId, selectedPlayerId);
        return;
      }

      // Toggle selection
      selectPlayer(selectedPlayerId === playerId ? undefined : playerId);
    },
    [
      selectedPlayerId,
      isSelectedOnField,
      selectPlayer,
      executeSubstitution,
      goalScorerMode,
    ],
  );

  // Handle action buttons (penalty, red card, injury) for selected field player
  const handlePenalty = useCallback(() => {
    if (!selectedPlayerId || !isSelectedOnField) return;
    registerPenalty(selectedPlayerId, defaultPenaltyDuration);
    selectPlayer(undefined);
  }, [
    selectedPlayerId,
    isSelectedOnField,
    registerPenalty,
    defaultPenaltyDuration,
    selectPlayer,
  ]);

  const handleRedCard = useCallback(() => {
    if (!selectedPlayerId || !isSelectedOnField) return;
    registerRedCard(selectedPlayerId, defaultPenaltyDuration);
    selectPlayer(undefined);
  }, [
    selectedPlayerId,
    isSelectedOnField,
    registerRedCard,
    defaultPenaltyDuration,
    selectPlayer,
  ]);

  const handleInjury = useCallback(() => {
    if (!selectedPlayerId || !isSelectedOnField) return;
    registerInjury(selectedPlayerId);
    selectPlayer(undefined);
  }, [selectedPlayerId, isSelectedOnField, registerInjury, selectPlayer]);

  const handleHomeGoal = useCallback(() => {
    setGoalScorerMode(true);
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

  // Switch to the other tab after selecting a player (for easier substitution flow)
  const handleFieldPlayerTapWithTabSwitch = useCallback(
    (playerId: string) => {
      handleFieldPlayerTap(playerId);
      // If we just selected (not deselected), switch to bench tab on mobile
      if (selectedPlayerId !== playerId && !goalScorerMode) {
        setMobileTab("bench");
      }
    },
    [handleFieldPlayerTap, selectedPlayerId, goalScorerMode],
  );

  const handleBenchPlayerTapWithTabSwitch = useCallback(
    (playerId: string) => {
      handleBenchPlayerTap(playerId);
      // If we just selected (not deselected), switch to field tab on mobile
      if (selectedPlayerId !== playerId) {
        setMobileTab("field");
      }
    },
    [handleBenchPlayerTap, selectedPlayerId],
  );

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
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5 sm:px-3 sm:py-2">
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
            {periodFinished && isLastPeriod && t("match.live.timer.matchEnded")}
          </span>
        </button>

        {/* Score */}
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

          {/* Undo */}
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

      {/* Goal scorer mode overlay */}
      {goalScorerMode && (
        <div className="flex items-center justify-between border-b border-amber-700 bg-amber-900/30 px-4 py-2">
          <span className="text-sm font-medium text-amber-300">
            {t("match.live.goal.selectScorer")}
          </span>
          <button
            type="button"
            onClick={() => setGoalScorerMode(false)}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-4 py-2",
              "text-sm text-amber-300",
              "transition-colors hover:bg-amber-900/50",
            )}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Action bar - Shows when field player selected */}
      {isSelectedOnField && selectedPlayer && (
        <div className="flex items-center gap-2 border-b border-orange-700 bg-orange-900/30 px-3 py-2">
          <span className="flex-1 text-sm font-medium text-orange-300">
            {selectedPlayer.name}
          </span>
          <button
            type="button"
            onClick={handlePenalty}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
              "text-sm font-medium text-amber-400",
              "bg-amber-900/50 transition-colors hover:bg-amber-900/70",
            )}
          >
            {t("match.live.actions.penalty")}
          </button>
          <button
            type="button"
            onClick={handleRedCard}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
              "text-sm font-medium text-red-400",
              "bg-red-900/50 transition-colors hover:bg-red-900/70",
            )}
          >
            {t("match.live.actions.redCard")}
          </button>
          <button
            type="button"
            onClick={handleInjury}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
              "text-sm font-medium text-orange-400",
              "bg-orange-900/50 transition-colors hover:bg-orange-900/70",
            )}
          >
            {t("match.live.actions.injury")}
          </button>
          <button
            type="button"
            onClick={() => selectPlayer(undefined)}
            className={cn(
              "min-h-10 min-w-10 touch-manipulation rounded-md px-2 py-1.5",
              "text-sm text-orange-300",
              "transition-colors hover:bg-orange-900/50",
            )}
          >
            ✕
          </button>
        </div>
      )}

      {/* Selection hint - Shows when bench player selected */}
      {isSelectedOnBench && selectedPlayer && (
        <div className="flex items-center justify-between border-b border-primary/50 bg-primary/10 px-3 py-2">
          <span className="text-sm font-medium text-primary">
            {t("match.live.selection.tapFieldPlayer", {
              name: selectedPlayer.name,
            })}
          </span>
          <button
            type="button"
            onClick={() => selectPlayer(undefined)}
            className={cn(
              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
              "text-sm text-primary",
              "transition-colors hover:bg-primary/20",
            )}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Mobile Tab Bar */}
      <div className="flex border-b border-border sm:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("field")}
          className={cn(
            "flex-1 touch-manipulation py-3 text-center text-sm font-medium",
            mobileTab === "field"
              ? "border-b-2 border-green-500 text-green-400"
              : "text-muted-foreground",
            // Highlight if bench player selected (indicating "tap here")
            isSelectedOnBench && mobileTab !== "field" && "bg-primary/10",
          )}
        >
          {t("match.live.field.title")} ({fieldPlayers.length})
          {isSelectedOnBench && mobileTab !== "field" && " ←"}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("bench")}
          className={cn(
            "flex-1 touch-manipulation py-3 text-center text-sm font-medium",
            mobileTab === "bench"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground",
            // Highlight if field player selected (indicating "tap here")
            isSelectedOnField && mobileTab !== "bench" && "bg-primary/10",
          )}
        >
          {isSelectedOnField && mobileTab !== "bench" && "→ "}
          {t("match.live.bench.title")} (
          {benchPlayers.length + outPlayers.length})
        </button>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Field Players */}
        <div
          className={cn(
            "flex flex-col border-r border-border",
            "w-full sm:w-[55%] lg:w-[60%]",
            mobileTab !== "field" && "hidden sm:flex",
          )}
        >
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
                const playTimeSeconds = getPlayerPlayTime(player);

                return (
                  <button
                    key={player.playerId}
                    type="button"
                    onClick={() =>
                      handleFieldPlayerTapWithTabSwitch(player.playerId)
                    }
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
                    aria-label={player.name}
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
                );
              })}

              {/* Penalty players */}
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
                        {formatTime(Math.floor(penalty.remainingSeconds))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bench + Out Players */}
        <div
          className={cn(
            "flex flex-col",
            "w-full sm:w-[45%] lg:w-[40%]",
            mobileTab !== "bench" && "hidden sm:flex",
          )}
        >
          <div className="hidden items-center justify-between px-3 py-2 sm:flex">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("match.live.bench.title")} ({benchPlayers.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex flex-col gap-2">
              {/* Bench players */}
              {benchPlayers.map((player) => {
                const isSelected = selectedPlayerId === player.playerId;
                const isSuggestedIn =
                  nextSuggestion?.playerInId === player.playerId;
                const playTimeSeconds = getPlayerPlayTime(player);

                return (
                  <button
                    key={player.playerId}
                    type="button"
                    onClick={() =>
                      handleBenchPlayerTapWithTabSwitch(player.playerId)
                    }
                    className={cn(
                      "flex min-h-16 w-full touch-manipulation items-center gap-3 rounded-xl p-3 sm:min-h-14 sm:rounded-lg",
                      "text-left transition-all select-none",
                      "bg-bench text-foreground",
                      isSelected && "ring-4 ring-orange-400",
                      isSuggestedIn &&
                        !isSelected &&
                        "ring-2 ring-amber-500/60",
                    )}
                    aria-label={player.name}
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

              {/* Out players (injured/red card) - can still be selected for replacement */}
              {outPlayers.length > 0 && (
                <>
                  <div className="mt-2 border-t border-border pt-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("match.live.out.title")}
                    </span>
                  </div>
                  {outPlayers.map((player) => {
                    const playTimeSeconds = getPlayerPlayTime(player);
                    const isInjured = player.status === "injured";
                    const isRedCarded = player.status === "redCard";

                    return (
                      <div
                        key={player.playerId}
                        className={cn(
                          "flex min-h-14 w-full items-center gap-3 rounded-lg p-3",
                          "text-left opacity-60",
                          isInjured && "bg-orange-900/20",
                          isRedCarded && "bg-red-900/20",
                        )}
                      >
                        {player.number !== undefined && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                            {player.number}
                          </span>
                        )}
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium leading-tight text-muted-foreground">
                            {player.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isInjured && t("match.live.out.injured")}
                            {isRedCarded && t("match.live.out.redCard")}
                            {" • "}
                            {formatTime(Math.floor(playTimeSeconds))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {benchPlayers.length === 0 && outPlayers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("match.live.bench.empty")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
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

        {/* Quick substitute button */}
        {nextSuggestion && !selectedPlayerId && (
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
          >
            ✕
          </button>
        </div>
      )}

      {/* End Match Modal */}
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

      {/* Dismiss overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMenu(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
