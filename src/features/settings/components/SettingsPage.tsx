import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { destroyAll } from "@/data/yjs";
import { Button } from "@/components/ui/button";
import { KofiButton } from "@/components/common/KofiButton";

const THEME_KEY = "subcoach-theme";

function getStoredTheme(): "dark" | "light" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(theme: "dark" | "light"): void {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function SettingsPage(): React.ReactNode {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang);
    },
    [i18n],
  );

  const handleDeleteAllData = useCallback(() => {
    const first = window.confirm(t("settings.deleteConfirm1"));
    if (!first) return;
    const second = window.confirm(t("settings.deleteConfirm2"));
    if (!second) return;
    destroyAll();
    window.location.reload();
  }, [t]);

  return (
    <div className="space-y-6 pb-8 pt-4">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {/* Language */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{t("settings.language")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.languageDescription")}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => handleLanguageChange("nl")}
            className={cn(
              "min-h-12 min-w-12 touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              i18n.language === "nl"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
            aria-label="Nederlands"
            aria-pressed={i18n.language === "nl"}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange("en")}
            className={cn(
              "min-h-12 min-w-12 touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              i18n.language === "en"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
            aria-label="English"
            aria-pressed={i18n.language === "en"}
          >
            EN
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{t("settings.theme")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("settings.themeDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-12 min-w-12 touch-manipulation rounded-lg border border-border bg-card p-2 transition-colors hover:bg-accent"
            aria-label={t("settings.toggleTheme")}
          >
            {theme === "dark" ? (
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
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
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
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{t("settings.about")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("settings.aboutDescription")}
        </p>
        <div className="mt-4 space-y-3">
          <a
            href="https://github.com/JelleGroenendal/SubCoach"
            target="_blank"
            rel="noopener noreferrer"
            className="block min-h-12 touch-manipulation text-sm text-primary underline-offset-4 hover:underline"
            aria-label={t("settings.github")}
          >
            {t("settings.github")}
          </a>
          <div>
            <KofiButton />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <h2 className="font-semibold text-red-400">
          {t("settings.dangerZone")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.dangerZoneDescription")}
        </p>
        <Button
          variant="destructive"
          size="xl"
          className="mt-4 touch-manipulation"
          onClick={handleDeleteAllData}
          aria-label={t("settings.deleteAllData")}
        >
          {t("settings.deleteAllData")}
        </Button>
      </div>

      {/* Version */}
      <p className="text-center text-xs text-muted-foreground">
        {t("settings.version", { version: "0.1.0" })}
      </p>
    </div>
  );
}
