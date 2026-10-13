"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type CommandEntry = { to: string; label: string; group: string; icon: LucideIcon };

/**
 * Jump anywhere in the pharmacy panel by typing: Ctrl+Shift+K, then a few
 * letters of where to go. Ctrl+K alone is left to the till, where it puts the
 * cursor in the product search.
 *
 * It lists exactly the screens the sidebar shows this login, so it cannot take
 * anyone somewhere their permissions do not.
 */
export const CommandBar = ({ open, onOpenChange, entries }: {
  open: boolean; onOpenChange: (open: boolean) => void; entries: CommandEntry[];
}) => {
  const t = useTranslations("pharmacyNav");
  const router = useRouter();

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && event.shiftKey && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", toggle);
    return () => document.removeEventListener("keydown", toggle);
  }, [open, onOpenChange]);

  const groups = [...new Set(entries.map(entry => entry.group))];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("commandPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("commandEmpty")}</CommandEmpty>
        {groups.map(group => (
          <CommandGroup key={group} heading={group}>
            {entries.filter(entry => entry.group === group).map(entry => (
              <CommandItem key={entry.to} value={`${entry.label} ${entry.group}`}
                onSelect={() => { onOpenChange(false); router.push(entry.to); }}>
                <entry.icon className="mr-2 h-4 w-4" /> {entry.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};
