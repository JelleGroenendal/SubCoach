import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTeamStore } from "@/stores/teamStore";
import { useMatchHistory } from "@/data/yjs";
import type { Match } from "@/data/schemas";

function formatMatchDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function HistoryListPage(): React.ReactNode {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeTeamId, initialize } = useTeamStore();
  const { matches, deleteFromHistory } = useMatchHistory(activeTeamId);
  const [search, setSearch] = useState("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return matches;
    return matches.filter((m: Match) =>
      m.opponentName.toLowerCase().includes(query),
    );
  }, [matches, search]);

  const handleDelete = useCallback(
    (matchId: string, opponentName: string) => {
      const confirmed = window.confirm(
        t("history.list.deleteConfirm", { opponent: opponentName }),
      );
      if (!confirmed) return;
      deleteFromHistory(matchId);
    },
    [t, deleteFromHistory],
  );

  return (
    <div className="space-y-4 pb-8 pt-4">
      <h1 className="text-2xl font-bold">{t("history.list.title")}</h1>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("history.list.searchPlaceholder")}
          className="min-h-12 w-full touch-manipulation rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t("history.list.searchPlaceholder")}
        />
      </div>

      {/* Match List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <p className="text-muted-foreground">
            {search ? t("history.list.noResults") : t("history.list.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((match: Match) => (
            <div key={match.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/history/${match.id}`)}
                className={cn(
                  "flex min-h-16 flex-1 touch-manipulation items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors",
                  "hover:bg-accent active:bg-accent/80",
                )}
                aria-label={t("history.list.viewMatch", {
                  opponent: match.opponentName,
                })}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{match.opponentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMatchDate(match.date, i18n.language)}
                  </p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-lg font-bold tabular-nums">
                    {match.homeScore} - {match.awayScore}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(match.id, match.opponentName)}
                className={cn(
                  "flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
                  "hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400",
                )}
                aria-label={t("history.list.deleteMatch", {
                  opponent: match.opponentName,
                })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
