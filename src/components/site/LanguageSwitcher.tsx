"use client";

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("bn") ? "BN" : "EN";

  const change = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        {compact ? current : current === "BN" ? "বাংলা" : "English"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] z-[60] bg-popover">
        <DropdownMenuItem onClick={() => change("en")}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => change("bn")}>বাংলা</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

