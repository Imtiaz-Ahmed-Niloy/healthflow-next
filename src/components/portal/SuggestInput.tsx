"use client";

import { useMemo, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * A text box that suggests from a list as you type, and still takes free
 * text. Enter picks the highlighted suggestion; the last row adds exactly
 * what was typed, for anything the list doesn't have. Used by the
 * prescription's Investigation section (the 0094 list).
 */

export type Suggestion = { name: string; category?: string | null };

type SuggestInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called with the picked suggestion or the typed text. */
  onPick: (value: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  limit?: number;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 0 = the name starts with it, 1 = each word starts a word, 2 = each word is in there somewhere, -1 = no match. */
const rank = (name: string, q: string, words: string[], wordStarts: RegExp[]) => {
  if (name.startsWith(q)) return 0;
  if (!words.every(w => name.includes(w))) return -1;
  return wordStarts.every(re => re.test(name)) ? 1 : 2;
};

export const SuggestInput = ({ value, onChange, onPick, suggestions, placeholder, limit = 8 }: SuggestInputProps) => {
  const t = useTranslations("pickers");
  const [open, setOpen] = useState(true);
  const q = value.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    const words = q.split(/\s+/);
    const wordStarts = words.map(w => new RegExp(`(^|[\\s(/,-])${escapeRegExp(w)}`));
    return suggestions
      .map(s => ({ s, r: rank(s.name.toLowerCase(), q, words, wordStarts) }))
      .filter(m => m.r >= 0)
      .sort((a, b) => a.r - b.r || a.s.name.length - b.s.name.length)
      .slice(0, limit)
      .map(m => m.s);
  }, [q, suggestions, limit]);

  const exact = matches.some(m => m.name.toLowerCase() === q);
  const showList = open && q.length > 0;

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      className="relative flex-1"
      onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
    >
      <CommandPrimitive.Input
        autoFocus
        value={value}
        onValueChange={v => { onChange(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {showList && (
        <CommandPrimitive.List
          // Keep focus in the box, so a click lands before blur closes the list.
          onMouseDown={e => e.preventDefault()}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {matches.map(m => (
            <CommandPrimitive.Item
              key={m.name}
              value={m.name}
              onSelect={() => onPick(m.name)}
              className="flex cursor-pointer flex-col items-start rounded-md px-2.5 py-1.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <span className="w-full break-words">{m.name}</span>
              {m.category && <span className="w-full text-[11px] text-muted-foreground">{m.category}</span>}
            </CommandPrimitive.Item>
          ))}
          {!exact && (
            <CommandPrimitive.Item
              value={`__typed__${value}`}
              onSelect={() => onPick(value.trim())}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("addTyped", { value: value.trim() })}</span>
            </CommandPrimitive.Item>
          )}
        </CommandPrimitive.List>
      )}
    </CommandPrimitive>
  );
};
