"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { useChangeLocale } from "@/i18n/useChangeLocale";

/**
 * English / বাংলা, on the navbar and every panel's top bar. The choice is a
 * cookie, so it holds across the whole site and survives a reload.
 */
const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const t = useTranslations("common");
  const { locale, change, pending } = useChangeLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted transition-colors ${pending ? "opacity-60" : ""}`}
        aria-label={t("changeLanguage")}
      >
        <Globe className="h-3.5 w-3.5" />
        {compact ? locale.toUpperCase() : LOCALE_LABELS[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] z-[60] bg-popover">
        {LOCALES.map(l => (
          <DropdownMenuItem key={l} onClick={() => change(l)} className={l === locale ? "font-semibold text-primary" : ""}>
            {LOCALE_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
