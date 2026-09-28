"use client";

import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useChangeLocale } from "@/i18n/useChangeLocale";
import type { Locale } from "@/i18n/config";

/**
 * English / বাংলা, on the navbar and every panel's top bar. The choice is a
 * cookie, so it holds across the whole site and survives a reload.
 *
 * `compact` shows the short names (EN / বাং) on phones, where a top bar has
 * no room, and the full names on desktop like the landing page's.
 */
const LanguageSwitcher = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const t = useTranslations("common");
  const { locale, change, pending } = useChangeLocale();

  return (
    <LanguageToggle
      value={locale as Locale}
      onChange={change}
      label={t("changeLanguage")}
      short={compact ? "mobile" : false}
      busy={pending}
      className={className}
    />
  );
};

export default LanguageSwitcher;
