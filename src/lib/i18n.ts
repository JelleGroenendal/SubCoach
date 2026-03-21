import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

export function initI18n(): typeof i18n {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "nl",
      supportedLngs: ["nl", "en"],
      ns: ["translation"],
      defaultNS: "translation",
      backend: {
        loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
    });

  return i18n;
}
