import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { Button } from "@/components/ui/button";
import { getSportProfile } from "@/engine/sport-profiles";
import type { Player } from "@/data/schemas";

const PERIOD_DURATION_OPTIONS = [10, 15, 20, 25, 30] as const;
const PLAYERS_ON_FIELD_OPTIONS = [
  { value: 5, label: "4+1" },
  { value: 6, label: "5+1" },
  { value: 7, label: "6+1" },
] as const;

export function TeamEditPage(): React.ReactNode {
  const { t } = useTranslation();
  const {
    team,
    players,
    loading,
    initialize,
    createTeam,
    updateTeam,
    addPlayer,
    updatePlayer,
    removePlayer,
  } = useTeamStore();

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | undefined>(
    undefined,
  );
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
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

    addPlayer(name, validNumber);
    setNewPlayerName("");
    setNewPlayerNumber("");
    nameInputRef.current?.focus();
  }, [newPlayerName, newPlayerNumber, addPlayer]);

  const handleStartEdit = useCallback(
    (playerId: string, name: string, number: number | undefined) => {
      setEditingPlayerId(playerId);
      setEditName(name);
      setEditNumber(number !== undefined ? String(number) : "");
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

    updatePlayer(editingPlayerId, { name, number: validNumber });
    setEditingPlayerId(undefined);
    setEditName("");
    setEditNumber("");
  }, [editingPlayerId, editName, editNumber, updatePlayer]);

  const handleCancelEdit = useCallback(() => {
    setEditingPlayerId(undefined);
    setEditName("");
    setEditNumber("");
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

  const sportProfile = useMemo(
    () => (team ? getSportProfile(team.sportProfileId) : undefined),
    [team],
  );

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
  const sportName = sportProfile ? t(sportProfile.name) : team.sportProfileId;

  return (
    <div className="flex flex-col gap-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("team.edit.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("team.edit.description")}
        </p>
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

        {/* Sport Profile (disabled for MVP) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            {t("team.edit.settings.sport")}
          </label>
          <div
            className={cn(
              "min-h-12 flex items-center rounded-lg border border-input bg-muted px-3 py-2",
              "text-base text-muted-foreground",
            )}
          >
            {sportName}
          </div>
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
          <label className="text-sm font-medium text-muted-foreground">
            {t("team.edit.settings.periodCount")}
          </label>
          <div
            className={cn(
              "min-h-12 flex items-center rounded-lg border border-input bg-muted px-3 py-2",
              "text-base text-muted-foreground",
            )}
          >
            {team.settings.periodCount}
          </div>
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
                  className="flex items-center gap-2 rounded-lg border border-ring bg-background p-3"
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
                      "min-h-10 flex-1 touch-manipulation rounded-md border border-input bg-background px-2 py-1",
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
                      "min-h-10 w-16 touch-manipulation rounded-md border border-input bg-background px-2 py-1",
                      "text-center text-base text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    placeholder="#"
                    min={1}
                    max={99}
                  />
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
                <span className="flex-1 text-base font-medium text-foreground">
                  {player.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleStartEdit(player.id, player.name, player.number)
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
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <input
            ref={nameInputRef}
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPlayer();
            }}
            className={cn(
              "min-h-12 flex-1 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
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
              "min-h-12 w-20 touch-manipulation rounded-lg border border-input bg-background px-3 py-2",
              "text-center text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            placeholder="#"
            min={1}
            max={99}
          />
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
    </div>
  );
}
