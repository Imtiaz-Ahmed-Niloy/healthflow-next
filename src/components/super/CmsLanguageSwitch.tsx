"use client";

import { useTranslations } from "next-intl";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { LanguageToggle } from "@/components/common/LanguageToggle";

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
      <LanguageToggle value={value} onChange={onChange} label={t("home.language")} />
      <p className="text-xs text-muted-foreground">{t("languageNote", { language: LOCALE_LABELS[value] })}</p>
    </div>
  );
};

export default CmsLanguageSwitch;
