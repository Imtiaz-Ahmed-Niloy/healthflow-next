"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DAYS, dayLabel, defaultWeek, formatDay, parseWeek, serialiseWeek, summariseWeek,
  type DayHours, type DayKey, type WeekHours,
} from "@/lib/hours";

/**
 * The seven-day hours editor: a hospital's operating hours, and a doctor's
 * availability (src/lib/availability.ts reads the same shape).
 *
 * One value, posted as JSON — see src/lib/hours.ts. With `name` it writes a
 * hidden input for FormData forms; with `onChange` it reports the week to a
 * controlled one. `seed` decides the opening week from what is stored, so a
 * doctor's old free-text hours can open as a week rather than the default.
 *
 * Built around the fact that a hospital almost never has seven different
 * schedules. It has one, and then Friday is different. So the row does the
 * work: set a day, then "Copy to all" pushes it across the week and you
 * correct the one or two that differ. Filling seven rows by hand is possible,
 * but it is not the path the design expects anyone to take.
 *
 * Each day carries a MODE rather than only a pair of times, because "Closed"
 * and "Open 24 hours" are not times. Encoding them as 00:00–00:00 is how a
 * hospital ends up claiming to be shut and open at once.
 */
export const WeeklyHoursField = ({
  name, defaultValue, seed, onChange, summaryLabel,
}: {
  name?: string;
  defaultValue?: unknown;
  seed?: (value: unknown) => WeekHours;
  onChange?: (week: WeekHours) => void;
  /** Defaults to "Visitors see", in the reader's language. */
  summaryLabel?: string;
}) => {
  const t = useTranslations("weeklyHours");
  const locale = useLocale();
  const [week, setWeek] = useState<WeekHours>(() =>
    seed ? seed(defaultValue) : parseWeek(defaultValue) ?? defaultWeek());

  const update = (next: WeekHours) => { setWeek(next); onChange?.(next); };

  const setDay = (key: DayKey, day: DayHours) => update({ ...week, [key]: day });

  const copyToAll = (key: DayKey) =>
    update(DAYS.reduce((next, d) => ({ ...next, [d.key]: week[key] }), {} as WeekHours));

  const summary = summariseWeek(week, locale);

  return (
    <div className="space-y-3">
      {name && <input type="hidden" name={name} value={serialiseWeek(week)} />}

      <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">
        {DAYS.map(d => {
          const day = week[d.key];
          const label = dayLabel(d.key, locale);
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-muted/30">
              <span className="w-24 shrink-0 text-sm font-medium text-foreground/80">{label}</span>

              <select
                value={day.mode}
                onChange={e => {
                  const mode = e.target.value as DayHours["mode"];
                  if (mode === "hours") {
                    // Keep the times the row last had rather than snapping
                    // back to the default and throwing away the edit.
                    const prev = day.mode === "hours" ? day : null;
                    setDay(d.key, { mode: "hours", open: prev?.open ?? "09:00", close: prev?.close ?? "17:00" });
                  } else {
                    setDay(d.key, { mode } as DayHours);
                  }
                }}
                className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="hours">{t("open")}</option>
                <option value="24h">{t("open24")}</option>
                <option value="closed">{t("closed")}</option>
              </select>

              {day.mode === "hours" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={day.open}
                    onChange={e => setDay(d.key, { ...day, open: e.target.value })}
                    className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">{t("to")}</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={e => setDay(d.key, { ...day, close: e.target.value })}
                    className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">{formatDay(day, locale)}</span>
              )}

              <button
                type="button"
                onClick={() => copyToAll(d.key)}
                title={t("copyDay", { day: label })}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground border border-transparent hover:border-border hover:text-primary"
              >
                <Copy className="h-3 w-3" /> {t("copyToAll")}
              </button>
            </div>
          );
        })}
      </div>

      {/* What a visitor will actually be shown. The editor is seven rows; the
          public page collapses them, so the admin should see that collapse. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">{summaryLabel ?? t("visitorsSee")}</span>
        {summary.map(row => (
          <span key={row.days} className="rounded-full bg-muted/50 px-2.5 py-1">
            <span className="font-medium text-foreground/70">{row.days}</span> · {row.hours}
          </span>
        ))}
      </div>
    </div>
  );
};
