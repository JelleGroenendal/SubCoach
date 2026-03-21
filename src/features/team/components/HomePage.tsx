import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function HomePage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("home.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("home.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          to="/team/edit"
          className="min-h-16 min-w-16 touch-manipulation rounded-lg bg-primary px-6 py-4 text-center text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("home.editTeam")}
        </Link>
        <Link
          to="/match/setup"
          className="min-h-16 min-w-16 touch-manipulation rounded-lg bg-field px-6 py-4 text-center text-lg font-medium text-white transition-colors hover:bg-field/90"
        >
          {t("home.startMatch")}
        </Link>
        <Link
          to="/history"
          className="min-h-16 min-w-16 touch-manipulation rounded-lg bg-secondary px-6 py-4 text-center text-lg font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
        >
          {t("home.matchHistory")}
        </Link>
      </div>
    </div>
  );
}
