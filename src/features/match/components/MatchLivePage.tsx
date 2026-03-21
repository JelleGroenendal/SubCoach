import { useTranslation } from "react-i18next";

export function MatchLivePage(): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-2xl font-bold">{t("match.live.title")}</h1>
    </div>
  );
}
