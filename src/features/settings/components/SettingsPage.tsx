import { useTranslation } from "react-i18next";

export function SettingsPage(): React.ReactNode {
  const { t, i18n } = useTranslation();

  const toggleLanguage = (): void => {
    const newLang = i18n.language === "nl" ? "en" : "nl";
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <h2 className="font-medium">{t("settings.language")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.languageDescription")}
            </p>
          </div>
          <button
            onClick={toggleLanguage}
            className="min-h-12 min-w-12 touch-manipulation rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            {i18n.language === "nl" ? "English" : "Nederlands"}
          </button>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="font-medium">{t("settings.about")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.aboutDescription")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("settings.version", { version: "0.1.0" })}
          </p>
        </div>
      </div>
    </div>
  );
}
