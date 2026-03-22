import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useTeamRefs } from "@/data/yjs";
import { getAllSportProfiles } from "@/engine/sport-profiles";
import type { TeamRef } from "@/data/schemas";

export function TeamSelector(): React.ReactNode {
  const { t } = useTranslation();
  const { activeTeamId, selectTeam, createTeam, initialize } = useTeamStore();
  const { teamRefs } = useTeamRefs();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("handball");

  const sportProfiles = getAllSportProfiles();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeTeam = teamRefs.find((ref: TeamRef) => ref.id === activeTeamId);

  const handleSelect = useCallback(
    async (teamId: string) => {
      await selectTeam(teamId);
      setIsOpen(false);
    },
    [selectTeam],
  );

  const handleCreateTeam = useCallback(() => {
    const name = newTeamName.trim();
    if (name.length === 0) return;

    createTeam(name, newTeamSport);
    setNewTeamName("");
    setNewTeamSport("handball");
    setShowCreateForm(false);
    setIsOpen(false);
  }, [newTeamName, newTeamSport, createTeam]);

  const handleOpenCreateForm = useCallback(() => {
    setShowCreateForm(true);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
    setNewTeamName("");
    setNewTeamSport("handball");
  }, []);

  // Don't show if no teams yet (HomePage handles initial team creation)
  if (teamRefs.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-12 items-center gap-2 rounded-lg border border-border px-3 py-2",
          "touch-manipulation text-sm font-medium transition-colors",
          "hover:bg-accent",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("teamSelector.selectTeam")}
      >
        <span className="max-w-32 truncate">
          {activeTeam?.name ?? t("teamSelector.noTeam")}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              handleCancelCreate();
            }}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1 min-w-56 rounded-lg border border-border bg-card shadow-lg sm:left-auto sm:right-0",
            )}
            role="listbox"
            aria-label={t("teamSelector.teamList")}
          >
            {/* Team list */}
            {teamRefs.map((ref: TeamRef) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => handleSelect(ref.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  "touch-manipulation transition-colors first:rounded-t-lg",
                  ref.id === activeTeamId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
                role="option"
                aria-selected={ref.id === activeTeamId}
              >
                <span className="flex-1 truncate">{ref.name}</span>
                {ref.id === activeTeamId && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Create new team section */}
            {showCreateForm ? (
              <div className="p-3">
                <div className="mb-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder={t("teamSelector.teamNamePlaceholder")}
                    className={cn(
                      "w-full min-h-10 rounded-md border border-input bg-background px-3 py-2",
                      "text-sm placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTeam();
                      if (e.key === "Escape") handleCancelCreate();
                    }}
                  />
                </div>
                <div className="mb-3">
                  <select
                    value={newTeamSport}
                    onChange={(e) => setNewTeamSport(e.target.value)}
                    className={cn(
                      "w-full min-h-10 rounded-md border border-input bg-background px-3 py-2",
                      "text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                  >
                    {sportProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {t(profile.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateTeam}
                    disabled={newTeamName.trim().length === 0}
                    className={cn(
                      "flex-1 min-h-10 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground",
                      "touch-manipulation transition-colors",
                      "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {t("teamSelector.create")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    className={cn(
                      "min-h-10 rounded-md border border-border px-3 py-2 text-sm font-medium",
                      "touch-manipulation transition-colors hover:bg-accent",
                    )}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateForm}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  "touch-manipulation transition-colors rounded-b-lg",
                  "text-primary hover:bg-accent/50",
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                <span>{t("teamSelector.newTeam")}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
