"use client";

import { useI18n } from "@/lib/i18n/context";

export function LanguageToggle() {
  const { locale, setLocale, m } = useI18n();

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLocale(locale === "en" ? "pt" : "en")}
      aria-label={locale === "en" ? m.lang.switchToPt : m.lang.switchToEn}
    >
      <i className="fa-solid fa-language" aria-hidden="true" />
      <span>{locale === "en" ? m.lang.switchToPt : m.lang.switchToEn}</span>
    </button>
  );
}
