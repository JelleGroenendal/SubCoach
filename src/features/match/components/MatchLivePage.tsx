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
import { getTeamDoc } from "@/data/yjs/yjsProvider";
import { useP2PSync } from "@/data/sync";
import { P2PSyncPanel } from "./P2PSyncPanel";
import type { MatchPlayer } from "@/data/schemas";

type MobileTab = "field" | "bench";

export function MatchLivePage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { team, loading: teamLoading, initialize } = useTeamStore();
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
    selectedPlayerIds,
    substitutionPlan,
    showUndo,
    lastAction,
    pendingReplacement,
    isHost,
    setTeamId,
    loadMatch,
    startTimer,
    pauseTimer,
    updateElapsed,
    startNextPeriod,
    togglePlayerSelection,
    clearSelection,
    executeSubstitution,
    registerGoal,
    registerOpponentGoal,
    registerPenalty,
    registerYellowCard,
    registerRedCard,
    registerInjury,
    recoverFromInjury,
    completePendingReplacement,
    cancelPendingReplacement,
    endPenalty,
    undoLastAction,
    dismissUndo,
    endMatch,
    autoSave,
    adjustScore,
  } = useMatchStore();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showScoreEdit, setShowScoreEdit] = useState<"home" | "away" | null>(
    null,
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("field");
  const [pendingInjuryPlayerId, setPendingInjuryPlayerId] = useState<
    string | null
  >(null);

  // P2P sync
  const { isConnected, peerCount } = useP2PSync();
  const teamDoc = useMemo(
    () => (team ? getTeamDoc(team.id) : undefined),
    [team],
  );
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const lastTickTimeRef = useRef<number>(0);

  // Initialize team store on mount (loads from Yjs/IndexedDB)
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set team ID and load match once team is loaded
  useEffect(() => {
    if (team && !teamLoading) {
      setTeamId(team.id);
      loadMatch();
    }
  }, [team, teamLoading, setTeamId, loadMatch]);

  // Wake lock
  useEffect(() => {
    const release = requestWakeLock();
    return () => {
      release?.();
    };
  }, []);

  // Timer tick (1s interval when playing) - only on host device
  // Viewers receive elapsed time via Yjs sync
  useEffect(() => {
    // Only run timer on host device
    if (!isHost) return;

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
  }, [match?.status, updateElapsed, isHost]);

  // Auto-save every 30 seconds - only on host device
  useEffect(() => {
    if (!isHost) return;

    autoSaveRef.current = setInterval(() => {
      autoSave();
    }, 30000);
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [autoSave, isHost]);

  // Halftime detection - only on host device
  useEffect(() => {
    if (!isHost) return;
    if (!match || match.status !== "playing") return;
    const periodSeconds = match.periodDurationMinutes * 60;
    if (isPeriodFinished(match.elapsedSeconds, periodSeconds)) {
      pauseTimer();
    }
  }, [match, pauseTimer, isHost]);

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

  const benchPlayers = useMemo(() => {
    if (!match) return [];
    const bench = match.roster.filter((p) => p.status === "bench");
    // Sort by last substitution time (most recent first)
    // Players who just came off the field should be at the top for easy re-substitution
    return bench.sort((a, b) => {
      const aLastOut =
        a.periods.length > 0
          ? (a.periods[a.periods.length - 1]?.outAt ?? 0)
          : 0;
      const bLastOut =
        b.periods.length > 0
          ? (b.periods[b.periods.length - 1]?.outAt ?? 0)
          : 0;
      return bLastOut - aLastOut; // Descending (most recent first)
    });
  }, [match]);

  // Group bench players by position group when position-aware substitutions is enabled
  const benchPlayersByGroup = useMemo(() => {
    if (
      !match?.usePositionAwareSubstitutions ||
      !sportProfile?.players.positionGroups
    ) {
      return null; // Return null to indicate ungrouped mode
    }

    const groups = sportProfile.players.positionGroups;
    const positions = sportProfile.players.positions ?? [];

    // Build positionId -> groupId map
    const positionToGroup: Record<string, string> = {};
    for (const pos of positions) {
      if (pos.groupId) {
        positionToGroup[pos.id] = pos.groupId;
      }
    }

    // Group players by their position group
    const grouped: Record<string, MatchPlayer[]> = {};
    const ungrouped: MatchPlayer[] = [];

    for (const player of benchPlayers) {
      const groupId = player.positionId
        ? positionToGroup[player.positionId]
        : undefined;
      if (groupId) {
        if (!grouped[groupId]) {
          grouped[groupId] = [];
        }
        grouped[groupId].push(player);
      } else {
        ungrouped.push(player);
      }
    }

    // Build result array with group info
    return groups
      .map((group) => ({
        groupId: group.id,
        groupName: group.name,
        players: grouped[group.id] ?? [],
      }))
      .filter((g) => g.players.length > 0 || g.groupId === "keeper") // Keep keeper group even if empty
      .concat(
        ungrouped.length > 0
          ? [
              {
                groupId: "other",
                groupName: "common.other",
                players: ungrouped,
              },
            ]
          : [],
      );
  }, [match?.usePositionAwareSubstitutions, sportProfile, benchPlayers]);

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

  // Get selected players info
  const selectedFieldPlayerIds = useMemo(() => {
    if (!match) return [];
    return selectedPlayerIds.filter((id) => {
      const player = match.roster.find((p) => p.playerId === id);
      return player?.status === "field";
    });
  }, [selectedPlayerIds, match]);

  const selectedBenchPlayerIds = useMemo(() => {
    if (!match) return [];
    return selectedPlayerIds.filter((id) => {
      const player = match.roster.find((p) => p.playerId === id);
      return player?.status === "bench";
    });
  }, [selectedPlayerIds, match]);

  const hasFieldSelection = selectedFieldPlayerIds.length > 0;
  const hasBenchSelection = selectedBenchPlayerIds.length > 0;

  // Handle field player tap - select for substitution
  const handleFieldPlayerTap = useCallback(
    (playerId: string) => {
      // If bench players are selected, execute substitution with first selected bench player
      if (hasBenchSelection) {
        const benchPlayerId = selectedBenchPlayerIds[0];
        if (benchPlayerId) {
          executeSubstitution(benchPlayerId, playerId);
        }
        return;
      }

      // Check max selection limit (can't select more field players than bench players available)
      const isAlreadySelected = selectedPlayerIds.includes(playerId);
      if (
        !isAlreadySelected &&
        selectedFieldPlayerIds.length >= benchPlayers.length
      ) {
        // Max reached, don't add more
        return;
      }

      // Toggle selection
      togglePlayerSelection(playerId);
    },
    [
      selectedPlayerIds,
      selectedFieldPlayerIds,
      selectedBenchPlayerIds,
      hasBenchSelection,
      benchPlayers.length,
      togglePlayerSelection,
      executeSubstitution,
    ],
  );

  // Handle bench player tap - execute substitution with selected field player
  const handleBenchPlayerTap = useCallback(
    (playerId: string) => {
      // If field players are selected, execute substitution with first selected field player
      if (hasFieldSelection) {
        const fieldPlayerId = selectedFieldPlayerIds[0];
        if (fieldPlayerId) {
          executeSubstitution(playerId, fieldPlayerId);
        }
        return;
      }

      // Bench players can also be selected for "reverse" substitution flow
      togglePlayerSelection(playerId);
    },
    [
      selectedFieldPlayerIds,
      hasFieldSelection,
      togglePlayerSelection,
      executeSubstitution,
    ],
  );

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
      case "yellowCard": {
        const carded = match?.roster.find((p) => p.playerId === event.playerId);
        return t("match.live.undo.yellowCard", { player: carded?.name ?? "?" });
      }
      case "redCard": {
        const cardedRed = match?.roster.find(
          (p) => p.playerId === event.playerId,
        );
        return t("match.live.undo.redCard", { player: cardedRed?.name ?? "?" });
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
  // Only works for host - viewers cannot interact with players
  const handleFieldPlayerTapWithTabSwitch = useCallback(
    (playerId: string) => {
      if (!isHost) return; // Viewers cannot interact
      const wasSelected = selectedPlayerIds.includes(playerId);
      handleFieldPlayerTap(playerId);
      // If we just selected (not deselected) and no bench selection, switch to bench tab
      if (!wasSelected && !hasBenchSelection) {
        setMobileTab("bench");
      }
    },
    [handleFieldPlayerTap, selectedPlayerIds, hasBenchSelection, isHost],
  );

  const handleBenchPlayerTapWithTabSwitch = useCallback(
    (playerId: string) => {
      if (!isHost) return; // Viewers cannot interact
      const wasSelected = selectedPlayerIds.includes(playerId);
      handleBenchPlayerTap(playerId);
      // If we just selected (not deselected) and no field selection, switch to field tab
      if (!wasSelected && !hasFieldSelection) {
        setMobileTab("field");
      }
    },
    [handleBenchPlayerTap, selectedPlayerIds, hasFieldSelection, isHost],
  );

  // Loading or no match loaded
  if (teamLoading || !match) {
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
      {/* Viewer Mode Banner - shown when not the match host */}
      {!isHost && (
        <div className="flex items-center justify-center gap-2 bg-amber-900/50 px-3 py-2 text-center">
          <span className="text-sm font-medium text-amber-200">
            {t("match.live.viewerMode")}
          </span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5 sm:px-3 sm:py-2">
        {/* Timer - clickable only for host */}
        <button
          type="button"
          onClick={isHost ? handleTimerTap : undefined}
          disabled={!isHost}
          className={cn(
            "flex min-h-12 touch-manipulation flex-col items-center rounded-lg px-3 py-1 sm:px-4",
            "transition-colors",
            match.status === "playing" && "bg-field/20",
            match.status === "paused" && "bg-amber-900/30",
            match.status === "setup" && "bg-primary/10",
            !isHost && "cursor-default",
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
        {/* Score display: home score (tap to edit) - away score - +1 for opponent */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={isHost ? () => setShowScoreEdit("home") : undefined}
            disabled={!isHost}
            className={cn(
              "min-w-8 touch-manipulation text-center text-2xl font-bold tabular-nums text-foreground transition-colors sm:min-w-10 sm:text-3xl lg:text-4xl",
              isHost && "hover:text-green-400",
              !isHost && "cursor-default",
            )}
            aria-label={t("match.live.score.editHome")}
          >
            {match.homeScore}
          </button>
          <span className="text-xl font-light text-muted-foreground sm:text-2xl">
            -
          </span>
          <button
            type="button"
            onClick={isHost ? () => setShowScoreEdit("away") : undefined}
            disabled={!isHost}
            className={cn(
              "min-w-8 touch-manipulation text-center text-2xl font-bold tabular-nums text-foreground transition-colors sm:min-w-10 sm:text-3xl lg:text-4xl",
              isHost && "hover:text-red-400",
              !isHost && "cursor-default",
            )}
            aria-label={t("match.live.score.editAway")}
          >
            {match.awayScore}
          </button>
          {/* Only show +1 opponent button for host */}
          {isHost && (
            <button
              type="button"
              onClick={() => registerOpponentGoal()}
              className={cn(
                "min-h-12 min-w-12 touch-manipulation rounded-lg px-2",
                "text-xs font-medium text-red-400",
                "transition-colors hover:bg-red-900/30",
              )}
              aria-label={t("match.live.score.addAway")}
            >
              +1
            </button>
          )}
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

          {/* Undo - host only */}
          {isHost && (
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
          )}

          {/* Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className={cn(
                "min-h-12 min-w-12 touch-manipulation rounded-lg px-2",
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
                    setShowSyncPanel(true);
                  }}
                  className={cn(
                    "flex min-h-12 w-full touch-manipulation items-center gap-2 rounded-md px-3 py-2",
                    "text-sm font-medium",
                    "transition-colors hover:bg-accent",
                    isConnected ? "text-green-400" : "text-foreground",
                  )}
                >
                  {isConnected
                    ? `${t("sync.connected")} (${peerCount + 1})`
                    : t("sync.title")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/help");
                  }}
                  className={cn(
                    "flex min-h-12 w-full touch-manipulation items-center gap-2 rounded-md px-3 py-2",
                    "text-sm font-medium text-foreground",
                    "transition-colors hover:bg-accent",
                  )}
                >
                  <span>❓</span>
                  {t("match.live.menu.help")}
                </button>
                {/* End match - host only */}
                {isHost && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selection indicator - Shows when field players selected (for substitution) */}
      {hasFieldSelection && (
        <div className="flex items-center justify-between border-b border-green-700 bg-green-900/30 px-3 py-2">
          <span className="text-sm font-medium text-green-300">
            {t("match.live.selection.fieldSelected", {
              count: selectedFieldPlayerIds.length,
            })}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className={cn(
              "min-h-12 touch-manipulation rounded-md px-3 py-2",
              "text-sm text-green-300",
              "transition-colors hover:bg-green-900/50",
            )}
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {/* Selection hint - Shows when bench players selected */}
      {hasBenchSelection && (
        <div className="flex items-center justify-between border-b border-primary/50 bg-primary/10 px-3 py-2">
          <span className="text-sm font-medium text-primary">
            {t("match.live.selection.benchSelected", {
              count: selectedBenchPlayerIds.length,
            })}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className={cn(
              "min-h-12 touch-manipulation rounded-md px-3 py-2",
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
            hasBenchSelection && mobileTab !== "field" && "bg-primary/10",
          )}
          aria-label={t("match.live.tabs.field")}
          aria-selected={mobileTab === "field"}
        >
          {t("match.live.field.title")} ({fieldPlayers.length})
          {hasBenchSelection && mobileTab !== "field" && " ←"}
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
            hasFieldSelection && mobileTab !== "bench" && "bg-primary/10",
          )}
          aria-label={t("match.live.tabs.bench")}
          aria-selected={mobileTab === "bench"}
        >
          {hasFieldSelection && mobileTab !== "bench" && "→ "}
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
                const isSelected = selectedPlayerIds.includes(player.playerId);
                const isSuggestedOut =
                  nextSuggestion?.playerOutId === player.playerId;
                const playTimeSeconds = getPlayerPlayTime(player);
                const playerPosition = player.positionId
                  ? sportProfile?.players.positions?.find(
                      (p) => p.id === player.positionId,
                    )
                  : undefined;

                return (
                  <div
                    key={player.playerId}
                    className={cn(
                      "flex min-h-24 w-full flex-col rounded-xl sm:min-h-20 sm:rounded-lg",
                      "bg-field text-white",
                      "overflow-hidden",
                      isSelected && "ring-4 ring-orange-400",
                      isSuggestedOut &&
                        !isSelected &&
                        "ring-2 ring-amber-500/60",
                    )}
                  >
                    {/* Main tap area - for substitution/goal */}
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldPlayerTapWithTabSwitch(player.playerId)
                      }
                      className={cn(
                        "flex flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 p-1.5",
                        "text-center transition-all select-none",
                      )}
                      aria-label={player.name}
                    >
                      <div className="flex items-center gap-1">
                        {player.number !== undefined && (
                          <span className="text-xs font-bold opacity-70">
                            #{player.number}
                          </span>
                        )}
                        {player.isKeeper && (
                          <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                            GK
                          </span>
                        )}
                        {playerPosition && !player.isKeeper && (
                          <span className="rounded bg-white/20 px-1 text-[10px] font-medium">
                            {t(playerPosition.abbreviation)}
                          </span>
                        )}
                        {(player.yellowCards ?? 0) > 0 && (
                          <span className="text-xs">
                            {"🟨".repeat(Math.min(player.yellowCards ?? 0, 2))}
                          </span>
                        )}
                        {player.goals > 0 && (
                          <span className="text-xs">
                            {"⚽".repeat(Math.min(player.goals, 5))}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold leading-tight sm:text-base">
                        {player.name}
                      </span>
                      <span className="text-[10px] tabular-nums opacity-70 sm:text-xs">
                        {formatTime(Math.floor(playTimeSeconds))}
                      </span>
                    </button>
                    {/* Quick action buttons - dynamic based on sport profile */}
                    <div className="flex border-t border-white/20">
                      {/* Time penalty buttons - show one button per penalty type */}
                      {sportProfile?.penalties.timePenalties &&
                        sportProfile.penalties.timePenalties.map((penalty) => (
                          <button
                            key={penalty.name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              registerPenalty(
                                player.playerId,
                                penalty.durationSeconds,
                                penalty.teamPlaysShort,
                              );
                            }}
                            className={cn(
                              "flex-1 touch-manipulation border-r border-white/20 py-1.5 text-[10px] font-medium transition-colors hover:bg-amber-900/50 sm:text-xs",
                              penalty.teamPlaysShort
                                ? "text-amber-300"
                                : "text-orange-300", // Different color for misconduct (no power play)
                            )}
                            aria-label={t("match.live.actions.penalty")}
                          >
                            {Math.floor(penalty.durationSeconds / 60)}m
                          </button>
                        ))}
                      {/* Yellow card button - show if sport has yellow cards */}
                      {sportProfile?.penalties.cards?.includes("yellow") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            registerYellowCard(
                              player.playerId,
                              sportProfile.penalties.secondYellowIsRed ?? false,
                              defaultPenaltyDuration,
                            );
                          }}
                          className={cn(
                            "flex-1 touch-manipulation border-r border-white/20 py-1.5 text-[10px] font-medium text-yellow-400 transition-colors hover:bg-yellow-900/50 sm:text-xs",
                            (player.yellowCards ?? 0) > 0 && "bg-yellow-900/30",
                          )}
                          aria-label={t("match.live.actions.yellowCard")}
                        >
                          🟨
                          {(player.yellowCards ?? 0) > 0 && (
                            <span className="ml-0.5">{player.yellowCards}</span>
                          )}
                        </button>
                      )}
                      {/* Red card button - show if sport has red cards */}
                      {sportProfile?.penalties.cards?.includes("red") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            registerRedCard(
                              player.playerId,
                              defaultPenaltyDuration,
                            );
                          }}
                          className="flex-1 touch-manipulation border-r border-white/20 py-1.5 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-900/50 sm:text-xs"
                          aria-label={t("match.live.actions.redCard")}
                        >
                          🟥
                        </button>
                      )}
                      {/* Goal button - always shown for field players */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          registerGoal(player.playerId);
                        }}
                        className="flex-1 touch-manipulation border-r border-white/20 py-1.5 text-[10px] font-medium text-green-300 transition-colors hover:bg-green-900/50 sm:text-xs"
                        aria-label={t("match.live.actions.goal")}
                      >
                        ⚽
                        {player.goals > 0 && (
                          <span className="ml-0.5">{player.goals}</span>
                        )}
                      </button>
                      {/* Injury button - always shown */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingInjuryPlayerId(player.playerId);
                        }}
                        className="flex-1 touch-manipulation py-1.5 text-[10px] font-medium text-orange-300 transition-colors hover:bg-orange-900/50 sm:text-xs"
                        aria-label={t("match.live.actions.injury")}
                      >
                        🤕
                      </button>
                    </div>
                  </div>
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
              {/* Bench players - grouped or ungrouped based on position-aware setting */}
              {benchPlayersByGroup
                ? // Grouped mode: show players by position group
                  benchPlayersByGroup.map((group) => (
                    <div key={group.groupId} className="flex flex-col gap-1">
                      {/* Group header - only show if there are players */}
                      {group.players.length > 0 && (
                        <div className="mt-1 mb-0.5 flex items-center gap-2 px-1 first:mt-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t(group.groupName)}
                          </span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      {group.players.map((player) => {
                        const isSelected = selectedPlayerIds.includes(
                          player.playerId,
                        );
                        const isSuggestedIn =
                          nextSuggestion?.playerInId === player.playerId;
                        const playTimeSeconds = getPlayerPlayTime(player);
                        const playerPosition = player.positionId
                          ? sportProfile?.players.positions?.find(
                              (p) => p.id === player.positionId,
                            )
                          : undefined;

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
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-medium leading-tight">
                                  {player.name}
                                </span>
                                {player.isKeeper && (
                                  <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                                    GK
                                  </span>
                                )}
                                {playerPosition && !player.isKeeper && (
                                  <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                                    {t(playerPosition.abbreviation)}
                                  </span>
                                )}
                              </div>
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
                    </div>
                  ))
                : // Ungrouped mode: flat list of bench players
                  benchPlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(
                      player.playerId,
                    );
                    const isSuggestedIn =
                      nextSuggestion?.playerInId === player.playerId;
                    const playTimeSeconds = getPlayerPlayTime(player);
                    const playerPosition = player.positionId
                      ? sportProfile?.players.positions?.find(
                          (p) => p.id === player.positionId,
                        )
                      : undefined;

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
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-medium leading-tight">
                              {player.name}
                            </span>
                            {player.isKeeper && (
                              <span className="rounded bg-amber-500 px-1 text-[10px] font-bold text-black">
                                GK
                              </span>
                            )}
                            {playerPosition && !player.isKeeper && (
                              <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                                {t(playerPosition.abbreviation)}
                              </span>
                            )}
                          </div>
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
                          "text-left",
                          isInjured && "bg-orange-900/20",
                          isRedCarded && "bg-red-900/20 opacity-60",
                        )}
                      >
                        {player.number !== undefined && (
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                            {player.number}
                          </span>
                        )}
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium leading-tight text-muted-foreground">
                              {player.name}
                            </span>
                            {isInjured && <span className="text-sm">🤕</span>}
                            {isRedCarded && <span className="text-sm">🟥</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {isInjured && t("match.live.out.injured")}
                            {isRedCarded && t("match.live.out.redCard")}
                            {" • "}
                            {formatTime(Math.floor(playTimeSeconds))}
                          </span>
                        </div>
                        {/* Recovery button - only for injured players */}
                        {isInjured && (
                          <button
                            type="button"
                            onClick={() => recoverFromInjury(player.playerId)}
                            className={cn(
                              "min-h-10 touch-manipulation rounded-md px-3 py-1.5",
                              "text-xs font-medium text-green-400",
                              "bg-green-900/30 transition-colors hover:bg-green-900/50",
                            )}
                            aria-label={t("match.live.injury.recover", {
                              name: player.name,
                            })}
                          >
                            {t("match.live.injury.recoverButton")}
                          </button>
                        )}
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
        {nextSuggestion &&
          selectedPlayerIds.length === 0 &&
          (() => {
            const playerIn = match.roster.find(
              (p) => p.playerId === nextSuggestion.playerInId,
            );
            const playerOut = match.roster.find(
              (p) => p.playerId === nextSuggestion.playerOutId,
            );
            const playerInTime = playerIn
              ? Math.round(getPlayerPlayTime(playerIn) / 60)
              : 0;
            const playerOutTime = playerOut
              ? Math.round(getPlayerPlayTime(playerOut) / 60)
              : 0;

            return (
              <button
                type="button"
                onClick={handleQuickSubstitute}
                className={cn(
                  "flex min-h-14 w-full touch-manipulation items-center justify-between gap-2 border-b border-border bg-amber-900/20 px-3 py-2",
                  "transition-colors hover:bg-amber-900/30",
                )}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium text-amber-300">
                    {t("match.live.suggestion.swap", {
                      playerIn: playerIn?.name ?? "?",
                      playerOut: playerOut?.name ?? "?",
                    })}
                  </span>
                  <span className="text-xs text-amber-400/70">
                    {t("match.live.suggestion.reason", {
                      playerIn: playerIn?.name ?? "?",
                      playerOut: playerOut?.name ?? "?",
                      inTime: playerInTime,
                      outTime: playerOutTime,
                    })}
                  </span>
                </div>
                <span className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {t("match.live.suggestion.execute")}
                </span>
              </button>
            );
          })()}

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

      {/* Injury Confirmation Modal */}
      {pendingInjuryPlayerId &&
        (() => {
          const player = match.roster.find(
            (p) => p.playerId === pendingInjuryPlayerId,
          );
          if (!player) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="mx-4 flex max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-foreground">
                  {t("match.live.injury.confirmTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("match.live.injury.confirmMessage", { name: player.name })}
                </p>
                <div className="flex gap-3">
                  <Button
                    size="xl"
                    variant="ghost"
                    className="flex-1 touch-manipulation"
                    onClick={() => setPendingInjuryPlayerId(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="xl"
                    variant="default"
                    className="flex-1 touch-manipulation bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      registerInjury(pendingInjuryPlayerId);
                      setPendingInjuryPlayerId(null);
                    }}
                  >
                    {t("match.live.injury.confirmButton")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Pending Replacement Modal */}
      {pendingReplacement &&
        (() => {
          const player = match.roster.find(
            (p) => p.playerId === pendingReplacement.playerId,
          );
          if (!player) return null;

          // Get available bench players
          const availableBench = match.roster.filter(
            (p) => p.status === "bench" && p.playerId !== match.keeperPlayerId,
          );

          // Determine message based on replacement type
          let message: string;
          if (pendingReplacement.type === "injury") {
            message = t("match.live.replacement.injuryMessage", {
              name: player.name,
            });
          } else if (pendingReplacement.type === "redCardPenaltyEnd") {
            message = t("match.live.replacement.redCardMessage", {
              name: player.name,
            });
          } else {
            message = t("match.live.replacement.penaltyEndMessage", {
              name: player.name,
            });
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-foreground">
                  {t("match.live.replacement.title")}
                </h3>
                <p className="text-sm text-muted-foreground">{message}</p>

                {availableBench.length > 0 ? (
                  <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {availableBench.map((benchPlayer) => (
                      <button
                        key={benchPlayer.playerId}
                        type="button"
                        onClick={() =>
                          completePendingReplacement(benchPlayer.playerId)
                        }
                        className={cn(
                          "flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-lg p-3",
                          "bg-muted text-left transition-colors hover:bg-accent",
                        )}
                      >
                        {benchPlayer.number !== undefined && (
                          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 text-sm font-bold text-primary">
                            {benchPlayer.number}
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          {benchPlayer.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    {t("match.live.replacement.noBenchPlayers")}
                  </p>
                )}

                <Button
                  size="xl"
                  variant="ghost"
                  className="touch-manipulation"
                  onClick={cancelPendingReplacement}
                >
                  {t("match.live.replacement.skipButton")}
                </Button>
              </div>
            </div>
          );
        })()}

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

      {/* Sync Panel Modal */}
      {showSyncPanel && teamDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <P2PSyncPanel doc={teamDoc} onClose={() => setShowSyncPanel(false)} />
        </div>
      )}

      {/* Score Edit Modal */}
      {showScoreEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-center text-lg font-bold text-foreground">
              {t(
                showScoreEdit === "home"
                  ? "match.live.score.editHomeTitle"
                  : "match.live.score.editAwayTitle",
              )}
            </h3>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() =>
                  adjustScore(
                    showScoreEdit,
                    (showScoreEdit === "home"
                      ? match.homeScore
                      : match.awayScore) - 1,
                  )
                }
                className="flex h-14 w-14 touch-manipulation items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground transition-colors hover:bg-accent"
              >
                -
              </button>
              <span className="min-w-16 text-center text-4xl font-bold tabular-nums text-foreground">
                {showScoreEdit === "home" ? match.homeScore : match.awayScore}
              </span>
              <button
                type="button"
                onClick={() =>
                  adjustScore(
                    showScoreEdit,
                    (showScoreEdit === "home"
                      ? match.homeScore
                      : match.awayScore) + 1,
                  )
                }
                className="flex h-14 w-14 touch-manipulation items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground transition-colors hover:bg-accent"
              >
                +
              </button>
            </div>
            <Button
              size="xl"
              variant="default"
              className="touch-manipulation"
              onClick={() => setShowScoreEdit(null)}
            >
              {t("common.done")}
            </Button>
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
