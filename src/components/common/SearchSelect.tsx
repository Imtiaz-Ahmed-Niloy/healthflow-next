"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/**
 * A select you can type into — for lists too long to scroll (64 districts, a
 * district's upazilas). Each option can carry `keywords` that the search
 * matches too, so "Comilla" or "কুমিল্লা" finds Cumilla. `""` is "nothing
 * picked", offered first as `allLabel`.
 */

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Matched by the search but not shown: other spellings, the Bangla name. */
  keywords?: string[];
  /** Options with a group are listed under that heading. */
  group?: string;
};

type SearchSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  allLabel: string;
  searchPlaceholder?: string;
  emptyText?: string;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export const SearchSelect = ({
  value, onChange, options, allLabel, searchPlaceholder, emptyText,
  icon, className, disabled, "aria-label": ariaLabel,
}: SearchSelectProps) => {
  const t = useTranslations("pickers");
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  const groups = [...new Set(options.map(o => o.group ?? ""))];

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox"
          className={`flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}>
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className={`truncate ${current ? "" : "text-muted-foreground"}`}>{current?.label ?? allLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("search")} />
          <CommandList>
            <CommandEmpty>{emptyText ?? t("nothingFound")}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => choose("")}>
                <Check className={`h-4 w-4 ${value ? "opacity-0" : "opacity-100"}`} />
                {allLabel}
              </CommandItem>
            </CommandGroup>
            {groups.map(g => (
              <CommandGroup key={g} heading={g || undefined}>
                {options.filter(o => (o.group ?? "") === g).map(o => (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} keywords={o.keywords} onSelect={() => choose(o.value)}>
                    <Check className={`h-4 w-4 ${o.value === value ? "opacity-100" : "opacity-0"}`} />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchSelect;
