import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import { getAllSportProfiles, getSportProfile } from "@/engine/sport-profiles";
import { TeamSyncSection } from "./TeamSyncSection";
import type { Player } from "@/data/schemas";
import type { Position } from "@/data/schemas/sportProfile";

const PERIOD_DURATION_OPTIONS = [
  5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45,
] as const;

// Generate player options from 4 to 11 (covers all sports)
function getPlayersOnFieldOptions(): Array<{ value: number; label: string }> {
  const options = [];
  for (let total = 4; total <= 11; total++) {
    const outfield = total - 1;
    options.push({ value: total, label: `${outfield}+1` });
  }
  return options;
}

export function TeamEditPage(): React.ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    team,
    players,
    loading,
    initialize,
    createTeam,
    updateTeam,
    deleteTeam,
    addPlayer,
    updatePlayer,
    removePlayer,
  } = useTeamStore();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPositionIds, setNewPlayerPositionIds] = useState<string[]>(
    [],
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | undefined>(
    undefined,
  );
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editPositionIds, setEditPositionIds] = useState<string[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const teamNameDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const clubNameDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-create team with defaults if none exists
  useEffect(() => {
    if (!loading && !team) {
      createTeam(t("team.edit.defaultTeamName"), "handball");
    }
  }, [loading, team, createTeam, t]);

  const handleTeamNameChange = useCallback(
    (value: string) => {
      if (teamNameDebounceRef.current) {
        clearTimeout(teamNameDebounceRef.current);
      }
      teamNameDebounceRef.current = setTimeout(() => {
        if (value.trim().length > 0) {
          updateTeam({ name: value.trim() });
        }
      }, 500);
    },
    [updateTeam],
  );

  const handleClubNameChange = useCallback(
    (value: string) => {
      if (clubNameDebounceRef.current) {
        clearTimeout(clubNameDebounceRef.current);
      }
      clubNameDebounceRef.current = setTimeout(() => {
        updateTeam({ clubName: value.trim() || undefined });
      }, 500);
    },
    [updateTeam],
  );

  const handleAddPlayer = useCallback(() => {
    const name = newPlayerName.trim();
    if (name.length === 0) return;

    const num = newPlayerNumber.trim();
    const parsedNumber = num.length > 0 ? parseInt(num, 10) : undefined;
    const validNumber =
      parsedNumber !== undefined &&
      !isNaN(parsedNumber) &&
      parsedNumber >= 1 &&
      parsedNumber <= 99
        ? parsedNumber
        : undefined;

    addPlayer(
      name,
      validNumber,
      newPlayerPositionIds[0], // Keep backward compat with positionId
      newPlayerPositionIds.length > 0 ? newPlayerPositionIds : undefined,
    );
    setNewPlayerName("");
    setNewPlayerNumber("");
    setNewPlayerPositionIds([]);
    nameInputRef.current?.focus();
  }, [newPlayerName, newPlayerNumber, newPlayerPositionIds, addPlayer]);

  const handleStartEdit = useCallback(
    (
      playerId: string,
      name: string,
      number: number | undefined,
      positionIds: string[] | undefined,
    ) => {
      setEditingPlayerId(playerId);
      setEditName(name);
      setEditNumber(number !== undefined ? String(number) : "");
      setEditPositionIds(positionIds ?? []);
    },
    [],
  );

  const handleSaveEdit = useCallback(() => {
    if (!editingPlayerId) return;
    const name = editName.trim();
    if (name.length === 0) return;

    const num = editNumber.trim();
    const parsedNumber = num.length > 0 ? parseInt(num, 10) : undefined;
    const validNumber =
      parsedNumber !== undefined &&
      !isNaN(parsedNumber) &&
      parsedNumber >= 1 &&
      parsedNumber <= 99
        ? parsedNumber
        : undefined;

    updatePlayer(editingPlayerId, {
      name,
      number: validNumber,
      positionId: editPositionIds[0], // Keep backward compat
      positionIds: editPositionIds.length > 0 ? editPositionIds : undefined,
    });
    setEditingPlayerId(undefined);
    setEditName("");
    setEditNumber("");
    setEditPositionIds([]);
  }, [editingPlayerId, editName, editNumber, editPositionIds, updatePlayer]);

  const handleCancelEdit = useCallback(() => {
    setEditingPlayerId(undefined);
    setEditName("");
    setEditNumber("");
    setEditPositionIds([]);
  }, []);

  const handleRemovePlayer = useCallback(
    (playerId: string) => {
      removePlayer(playerId);
      if (editingPlayerId === playerId) {
        setEditingPlayerId(undefined);
      }
    },
    [removePlayer, editingPlayerId],
  );

  const allSportProfiles = useMemo(() => getAllSportProfiles(), []);

  // Get positions for current sport profile
  const currentSportProfile = useMemo(
    () => (team ? getSportProfile(team.sportProfileId) : undefined),
    [team],
  );
  const positions: Position[] = currentSportProfile?.players.positions ?? [];

  const handleSportChange = useCallback(
    (newSportProfileId: string) => {
      const profile = getSportProfile(newSportProfileId);
      if (!profile) return;

      // Update sport and reset settings to sport defaults
      updateTeam({
        sportProfileId: newSportProfileId,
        settings: {
          periodDurationMinutes: profile.match.defaultPeriodDurationMinutes,
          periodCount: profile.match.defaultPeriodCount,
          playersOnField: profile.players.defaultPlayersOnField,
        },
      });
    },
    [updateTeam],
  );

  const handleDeleteTeam = useCallback(() => {
    if (!team) return;
    deleteTeam(team.id);
    navigate("/");
  }, [team, deleteTeam, navigate]);

  if (loading || !team) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const activePlayers = players.filter((p: Player) => p.active);
  const benchCount = Math.max(
    0,
    activePlayers.length - team.settings.playersOnField,
  );

  return (
    <div className="flex flex-col gap-8 py-6">
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
          <h1 className="text-2xl font-bold">{t("team.edit.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("team.edit.description")}
          </p>
        </div>
      </div>

      {/* Team Settings */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">
          {t("team.edit.settings.title")}
        </h2>

        {/* Team Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="team-name"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.teamName")}
          </label>
          <input
            id="team-name"
            type="text"
            defaultValue={team.name}
            onChange={(e) => handleTeamNameChange(e.target.value)}
            className={cn(
              "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            placeholder={t("team.edit.settings.teamNamePlaceholder")}
            maxLength={100}
          />
        </div>

        {/* Club Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="club-name"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.clubName")}
          </label>
          <input
            id="club-name"
            type="text"
            defaultValue={team.clubName ?? ""}
            onChange={(e) => handleClubNameChange(e.target.value)}
            className={cn(
              "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            placeholder={t("team.edit.settings.clubNamePlaceholder")}
            maxLength={100}
          />
        </div>

        {/* Sport Profile */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="sport-profile"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.sport")}
          </label>
          <select
            id="sport-profile"
            value={team.sportProfileId}
            onChange={(e) => handleSportChange(e.target.value)}
            className={cn(
              "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            {allSportProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {t(profile.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Period Duration */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="period-duration"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.periodDuration")}
          </label>
          <select
            id="period-duration"
            value={team.settings.periodDurationMinutes}
            onChange={(e) =>
              updateTeam({
                settings: {
                  ...team.settings,
                  periodDurationMinutes: parseInt(e.target.value, 10),
                },
              })
            }
            className={cn(
              "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            {PERIOD_DURATION_OPTIONS.map((min) => (
              <option key={min} value={min}>
                {t("team.edit.settings.periodDurationValue", { minutes: min })}
              </option>
            ))}
          </select>
        </div>

        {/* Period Count */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="period-count"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.periodCount")}
          </label>
          <select
            id="period-count"
            value={team.settings.periodCount}
            onChange={(e) =>
              updateTeam({
                settings: {
                  ...team.settings,
                  periodCount: parseInt(e.target.value, 10),
                },
              })
            }
            className={cn(
              "min-h-12 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        {/* Players on Field */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="players-on-field"
            className="text-sm font-medium text-muted-foreground"
          >
            {t("team.edit.settings.playersOnField")}
          </label>
          <select
            id="players-on-field"
            value={team.settings.playersOnField}
            onChange={(e) =>
              updateTeam({
                settings: {
                  ...team.settings,
                  playersOnField: parseInt(e.target.value, 10),
                },
              })
            }
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

        {/* Position-Aware Substitutions - only show if sport has positions */}
        {positions.length > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="position-aware"
                className="text-sm font-medium text-foreground"
              >
                {t("team.edit.settings.positionAware")}
              </label>
              <span className="text-xs text-muted-foreground">
                {t("team.edit.settings.positionAwareDescription")}
              </span>
            </div>
            <button
              id="position-aware"
              type="button"
              role="switch"
              aria-checked={
                team.settings.usePositionAwareSubstitutions ?? false
              }
              onClick={() =>
                updateTeam({
                  settings: {
                    ...team.settings,
                    usePositionAwareSubstitutions:
                      !team.settings.usePositionAwareSubstitutions,
                  },
                })
              }
              className={cn(
                "relative h-7 w-12 shrink-0 touch-manipulation rounded-full transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                team.settings.usePositionAwareSubstitutions
                  ? "bg-primary"
                  : "bg-input",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow-sm transition-transform",
                  team.settings.usePositionAwareSubstitutions &&
                    "translate-x-5",
                )}
              />
            </button>
          </div>
        )}

        {/* Substitution Timing Mode */}
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {t("team.edit.settings.substitutionMode")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("team.edit.settings.substitutionModeDescription")}
            </span>
          </div>

          {/* Mode Toggle Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                updateTeam({
                  settings: {
                    ...team.settings,
                    substitutionMode: "equal",
                  },
                })
              }
              className={cn(
                "flex-1 min-h-12 touch-manipulation rounded-lg border-2 px-4 py-2",
                "text-sm font-medium transition-colors",
                (team.settings.substitutionMode ?? "equal") === "equal"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
              )}
            >
              {t("team.edit.settings.modeEqual")}
            </button>
            <button
              type="button"
              onClick={() =>
                updateTeam({
                  settings: {
                    ...team.settings,
                    substitutionMode: "fixed",
                    fixedSubstitutionIntervalMinutes:
                      team.settings.fixedSubstitutionIntervalMinutes ??
                      currentSportProfile?.substitutions
                        .defaultIntervalMinutes ??
                      5,
                  },
                })
              }
              className={cn(
                "flex-1 min-h-12 touch-manipulation rounded-lg border-2 px-4 py-2",
                "text-sm font-medium transition-colors",
                team.settings.substitutionMode === "fixed"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
              )}
            >
              {t("team.edit.settings.modeFixed")}
            </button>
          </div>

          {/* Fixed Interval Selector - only shown when mode is "fixed" */}
          {team.settings.substitutionMode === "fixed" &&
            currentSportProfile?.substitutions.intervalPresetsMinutes && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="fixed-interval"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("team.edit.settings.fixedInterval")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentSportProfile.substitutions.intervalPresetsMinutes.map(
                    (minutes) => {
                      const isSelected =
                        team.settings.fixedSubstitutionIntervalMinutes ===
                        minutes;
                      return (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() =>
                            updateTeam({
                              settings: {
                                ...team.settings,
                                fixedSubstitutionIntervalMinutes: minutes,
                              },
                            })
                          }
                          className={cn(
                            "min-h-12 min-w-12 touch-manipulation rounded-lg border-2 px-4 py-2",
                            "text-sm font-medium transition-colors",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          {t("team.edit.settings.intervalMinutes", {
                            minutes,
                          })}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
        </div>
      </section>

      {/* Player List */}
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t("team.edit.players.title")}
          </h2>
          <span className="text-sm text-muted-foreground">
            {t("team.edit.players.count", {
              total: activePlayers.length,
              field: team.settings.playersOnField,
              bench: benchCount,
            })}
          </span>
        </div>

        {/* Player Cards */}
        {players.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">
            {t("team.edit.players.empty")}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {players.map((player: Player) => {
            const isEditing = editingPlayerId === player.id;

            if (isEditing) {
              return (
                <div
                  key={player.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-ring bg-background p-3"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className={cn(
                      "min-h-10 min-w-[100px] flex-1 touch-manipulation rounded-md border border-input bg-background px-2 py-1",
                      "text-base text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    placeholder={t("team.edit.players.namePlaceholder")}
                    maxLength={50}
                    autoFocus
                  />
                  <input
                    type="number"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className={cn(
                      "min-h-10 w-14 touch-manipulation rounded-md border border-input bg-background px-2 py-1",
                      "text-center text-base text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    placeholder="#"
                    min={1}
                    max={99}
                  />
                  {positions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map((pos) => {
                        const isSelected = editPositionIds.includes(pos.id);
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditPositionIds(
                                  editPositionIds.filter((id) => id !== pos.id),
                                );
                              } else {
                                setEditPositionIds([
                                  ...editPositionIds,
                                  pos.id,
                                ]);
                              }
                            }}
                            className={cn(
                              "min-h-8 touch-manipulation rounded-md border px-2 py-1",
                              "text-xs font-medium transition-colors",
                              isSelected
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-input bg-background text-muted-foreground hover:bg-accent",
                            )}
                            aria-label={t(pos.abbreviation)}
                            aria-pressed={isSelected}
                          >
                            {t(pos.abbreviation)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    size="xl"
                    variant="default"
                    className="touch-manipulation"
                    onClick={handleSaveEdit}
                    aria-label={t("common.save")}
                  >
                    {t("common.save")}
                  </Button>
                  <Button
                    size="xl"
                    variant="ghost"
                    className="touch-manipulation"
                    onClick={handleCancelEdit}
                    aria-label={t("common.cancel")}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              );
            }

            // Get positions for this player (support both positionIds array and legacy positionId)
            const playerPositions =
              player.positionIds && player.positionIds.length > 0
                ? positions.filter((p) => player.positionIds?.includes(p.id))
                : player.positionId
                  ? positions.filter((p) => p.id === player.positionId)
                  : [];

            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border p-3",
                  !player.active && "opacity-50",
                )}
              >
                {player.number !== undefined && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                    {player.number}
                  </span>
                )}
                <span
                  className={cn(
                    "flex-1 text-base font-medium",
                    player.active
                      ? "text-foreground"
                      : "text-muted-foreground line-through",
                  )}
                >
                  {player.name}
                </span>
                {playerPositions.length > 0 && (
                  <div className="flex gap-1">
                    {playerPositions.map((pos) => (
                      <span
                        key={pos.id}
                        className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {t(pos.abbreviation)}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updatePlayer(player.id, { active: !player.active })
                  }
                  className={cn(
                    "min-h-10 min-w-10 touch-manipulation rounded-md px-2 py-1",
                    "text-sm transition-colors",
                    player.active
                      ? "text-green-500 hover:bg-green-900/20"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                  aria-label={t(
                    player.active
                      ? "team.edit.players.deactivate"
                      : "team.edit.players.activate",
                    {
                      name: player.name,
                    },
                  )}
                >
                  {player.active ? "✓" : "○"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleStartEdit(
                      player.id,
                      player.name,
                      player.number,
                      player.positionIds ??
                        (player.positionId ? [player.positionId] : undefined),
                    )
                  }
                  className={cn(
                    "min-h-10 min-w-10 touch-manipulation rounded-md px-2 py-1",
                    "text-sm text-muted-foreground",
                    "transition-colors hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-label={t("team.edit.players.edit", {
                    name: player.name,
                  })}
                >
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePlayer(player.id)}
                  className={cn(
                    "min-h-10 min-w-10 touch-manipulation rounded-md px-2 py-1",
                    "text-sm text-destructive",
                    "transition-colors hover:bg-destructive/10",
                  )}
                  aria-label={t("team.edit.players.remove", {
                    name: player.name,
                  })}
                >
                  {t("common.delete")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Player Form */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <input
            ref={nameInputRef}
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPlayer();
            }}
            className={cn(
              "min-h-12 min-w-[120px] flex-1 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            placeholder={t("team.edit.players.namePlaceholder")}
            maxLength={50}
          />
          <input
            type="number"
            value={newPlayerNumber}
            onChange={(e) => setNewPlayerNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPlayer();
            }}
            className={cn(
              "min-h-12 w-16 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-center text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            placeholder="#"
            min={1}
            max={99}
          />
          {positions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {positions.map((pos) => {
                const isSelected = newPlayerPositionIds.includes(pos.id);
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNewPlayerPositionIds(
                          newPlayerPositionIds.filter((id) => id !== pos.id),
                        );
                      } else {
                        setNewPlayerPositionIds([
                          ...newPlayerPositionIds,
                          pos.id,
                        ]);
                      }
                    }}
                    className={cn(
                      "min-h-10 touch-manipulation rounded-md border px-2 py-1",
                      "text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-input bg-background text-muted-foreground hover:bg-accent",
                    )}
                    aria-label={t(pos.abbreviation)}
                    aria-pressed={isSelected}
                  >
                    {t(pos.abbreviation)}
                  </button>
                );
              })}
            </div>
          )}
          <Button
            size="match"
            variant="default"
            onClick={handleAddPlayer}
            disabled={newPlayerName.trim().length === 0}
            aria-label={t("team.edit.players.add")}
          >
            {t("team.edit.players.add")}
          </Button>
        </div>
      </section>

      {/* Sync with other coaches */}
      <TeamSyncSection teamId={team.id} syncRoomCode={team.syncRoomCode} />

      {/* Danger Zone */}
      <section className="flex flex-col gap-4 rounded-xl border border-destructive/50 bg-card p-5">
        <h2 className="text-lg font-semibold text-destructive">
          {t("team.edit.dangerZone.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("team.edit.dangerZone.description")}
        </p>

        {!showDeleteConfirm ? (
          <Button
            size="xl"
            variant="destructive"
            className="touch-manipulation self-start"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t("team.edit.dangerZone.deleteTeam")}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-destructive">
              {t("team.edit.dangerZone.confirmMessage", { name: team.name })}
            </p>
            <div className="flex gap-2">
              <Button
                size="xl"
                variant="destructive"
                className="touch-manipulation"
                onClick={handleDeleteTeam}
              >
                {t("team.edit.dangerZone.confirmDelete")}
              </Button>
              <Button
                size="xl"
                variant="ghost"
                className="touch-manipulation"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
