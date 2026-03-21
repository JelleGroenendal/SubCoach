import { useTranslation } from "react-i18next";

export function HistoryListPage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("history.list.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("history.list.description")}
      </p>
    </div>
  );
}
