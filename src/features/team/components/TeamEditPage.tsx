import { useTranslation } from "react-i18next";

export function TeamEditPage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold">{t("team.edit.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("team.edit.description")}</p>
    </div>
  );
}
