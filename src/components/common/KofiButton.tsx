import { useTranslation } from "react-i18next";

interface KofiButtonProps {
  kofiId?: string;
}

export function KofiButton({
  kofiId = "A0A31WEVPZ",
}: KofiButtonProps): React.ReactNode {
  const { t } = useTranslation();

  return (
    <a
      href={`https://ko-fi.com/${kofiId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
      style={{ backgroundColor: "#72a4f2" }}
      aria-label={t("settings.donate")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.053 2.678 2.053 2.678s5.556-.055 6.681-.055c1.266 0 1.296 1.262 2.168 1.262h5.945c.67 0 2.561-.906 2.561-3.032 0-2.126-.787-3.318-.787-3.318s3.238-.828 4.238-5.562zm-8.559 4.89c-.532.64-1.556 1.06-1.556 1.06l-5.322.023s-.398-.163-.418-.687c-.021-.524.398-.642.398-.642l5.457-.026s.921-.091 1.128-.467c.206-.376.156-.907-.226-1.312-.382-.406-3.985-3.877-3.985-3.877s-.341-.403-.078-.7c.264-.296.701-.264.701-.264l5.09 4.662s.668.553.668 1.273c0 .72-.326.957-.857 1.597z" />
      </svg>
      {t("settings.donate")}
    </a>
  );
}
