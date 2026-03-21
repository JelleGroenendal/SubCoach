import { useTranslation } from "react-i18next";

export function MatchSetupPage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("match.setup.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("match.setup.description")}
      </p>
    </div>
  );
}
