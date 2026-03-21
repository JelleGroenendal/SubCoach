import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function HistoryDetailPage(): React.ReactNode {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("history.detail.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("history.detail.matchId", { id })}
      </p>
    </div>
  );
}
