"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSpecialties } from "@/hooks/useSpecialties";

/**
 * Pick a doctor's specialty from the list (0093), searching as you type —
 * Add Doctor, Edit Doctor, and a doctor's own profile.
 *
 * Controlled with `value`/`onChange`, or with `name` for a FormData form: it
 * then keeps its own value and writes a hidden input under that name. A
 * doctor whose specialty isn't on the list (typed before there was one, or
 * since hidden) keeps it as the first option, so opening their form doesn't
 * quietly blank it.
 */

/** The admin forms' input look (components/admin/crud). */
const TRIGGER = "w-full flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm text-left";

export const SpecialtySelect = ({ value, onChange, name, defaultValue = "", placeholder = "Select a specialty…", className = TRIGGER, icon, noneLabel = "No specialty" }: {
  value?: string;
  onChange?: (value: string) => void;
  /** For a FormData form: writes a hidden input with this name. */
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  /** The trigger's classes — defaults to the admin forms' input look. */
  className?: string;
  /** Shown before the value in the trigger. */
  icon?: ReactNode;
  /** The option that clears it — "All specialties" when it's a filter. */
  noneLabel?: string;
}) => {
  const { specialties } = useSpecialties();
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;

  const choose = (next: string) => {
    setOwn(next);
    onChange?.(next);
    setOpen(false);
  };

  const options = current && !specialties.includes(current) ? [current, ...specialties] : specialties;

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* Radix gives the trigger its aria-expanded and aria-controls. */}
          <button type="button" aria-haspopup="listbox" className={className}>
            <span className="flex min-w-0 items-center gap-2">
              {icon}
              <span className={`truncate ${current ? "" : "text-muted-foreground"}`}>{current || placeholder}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        {/* Above the admin Modal (z-60), which these forms often sit in. */}
        <PopoverContent align="start" className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
          <Command>
            <CommandInput placeholder="Search specialties…" />
            <CommandList>
              <CommandEmpty>No specialty found.</CommandEmpty>
              <CommandGroup>
                {current && (
                  <CommandItem value="__none__" onSelect={() => choose("")} className="text-muted-foreground">
                    <span className="w-4" /> {noneLabel}
                  </CommandItem>
                )}
                {options.map(s => (
                  <CommandItem key={s} value={s} onSelect={() => choose(s)}>
                    <Check className={`h-4 w-4 ${s === current ? "opacity-100" : "opacity-0"}`} />
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default SpecialtySelect;
