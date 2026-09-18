"use client";

import { LOCALES, LOCALE_LABELS, LOCALE_SHORT_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The one look for picking a language: a pill with every language side by
 * side and a white thumb that slides to the chosen one. One tap switches —
 * with two languages a menu was a click too many.
 *
 * Presentational only. <LanguageSwitcher> wires it to the site's language
 * (the cookie); the CMS editors wire it to which copy of a page is being
 * edited (<CmsLanguageSwitch>).
 */
export const LanguageToggle = ({
  value,
  onChange,
  label,
  short = false,
  busy = false,
  className,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  /** What the control chooses, for screen readers — "Change language". */
  label: string;
  /** "EN / বাং" rather than "English / বাংলা", for a top bar. */
  short?: boolean;
  /** A switch in flight: dimmed, and announced as busy. */
  busy?: boolean;
  className?: string;
}) => {
  const index = Math.max(0, LOCALES.indexOf(value));

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-busy={busy || undefined}
      className={cn(
        "relative inline-grid shrink-0 rounded-full border border-border/60 bg-muted/60 p-1 transition-opacity",
        busy && "opacity-60",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${LOCALES.length}, minmax(0, 1fr))` }}
    >
      {/* The thumb: one column wide, moved a whole column per language. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-card shadow-soft ring-1 ring-border/50 transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${LOCALES.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {LOCALES.map(l => {
        const active = l === value;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l}
            title={LOCALE_LABELS[l]}
            onClick={() => onChange(l)}
            className={cn(
              "relative z-10 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              short ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1 text-xs",
              active ? "text-primary" : "text-muted-foreground hover:text-primary",
            )}
          >
            {short ? LOCALE_SHORT_LABELS[l] : LOCALE_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageToggle;
