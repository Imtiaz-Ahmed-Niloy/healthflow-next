"use client";

import { useTranslations } from "next-intl";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

/**
 * Which language of a CMS page is being edited.
 *
 * Each language is its own copy of the page (see data/cmsLocale.ts), so the
 * editor under this remounts on a switch — unsaved changes in the language
 * being left are dropped, which the note says.
 */
const CmsLanguageSwitch = ({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) => {
  const t = useTranslations("super.cmsEditor");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-full bg-muted/60 p-1" role="group" aria-label={t("home.language")}>
        {LOCALES.map(l => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={value === l}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${value === l ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"}`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("languageNote", { language: LOCALE_LABELS[value] })}</p>
    </div>
  );
};

export default CmsLanguageSwitch;
