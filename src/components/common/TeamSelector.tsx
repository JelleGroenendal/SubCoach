import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useTeamRefs } from "@/data/yjs";
import type { TeamRef } from "@/data/schemas";

export function TeamSelector(): React.ReactNode {
  const { t } = useTranslation();
  const { activeTeamId, selectTeam, initialize } = useTeamStore();
  const { teamRefs } = useTeamRefs();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeTeam = teamRefs.find((ref: TeamRef) => ref.id === activeTeamId);

  const handleSelect = useCallback(
    (teamId: string) => {
      selectTeam(teamId);
      setIsOpen(false);
    },
    [selectTeam],
  );

  // Don't show selector if only 0-1 teams
  if (teamRefs.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-1.5",
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
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div
            className={cn(
              "absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-border bg-card shadow-lg",
            )}
            role="listbox"
            aria-label={t("teamSelector.teamList")}
          >
            {teamRefs.map((ref: TeamRef) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => handleSelect(ref.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  "touch-manipulation transition-colors first:rounded-t-lg last:rounded-b-lg",
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
          </div>
        </>
      )}
    </div>
  );
}
