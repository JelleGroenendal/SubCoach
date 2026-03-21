import { useTranslation } from "react-i18next";

export function MatchSummaryPage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("match.summary.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("match.summary.description")}
      </p>
    </div>
  );
}
