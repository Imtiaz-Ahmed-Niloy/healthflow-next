/**
 * Weekly operating hours.
 *
 * One value covering all seven days, carried as JSON. The shape is deliberately
 * explicit — each day says what KIND of day it is rather than encoding it in
 * the times, because "closed" and "open around the clock" are not times and
 * pretending otherwise ("00:00–00:00") is how you end up with a hospital that
 * claims to be shut and open at once.
 *
 * Storage is not settled yet. The JSON goes into the existing `opening_hours`
 * text column for now, which needs no migration; `jsonb` is the obvious home
 * later and `parseWeek` already tolerates either.
 *
 * Text meant for a person — a day's name, "Closed" — comes out in their
 * language: pass a `locale` (English when left out; words in
 * src/i18n/libText.ts).
 */

import type { Locale } from "@/i18n/config";
import { libWords } from "@/i18n/libText";

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/**
 * Sunday first, Friday and Saturday last.
 *
 * That is the Bangladeshi week — the working week runs Sunday to Thursday and
 * the weekend is Friday and Saturday. A Monday-first list would put this
 * country's weekend in the middle of the table.
 */
export const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "sun", label: "Sunday", short: "Sun" },
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
];

/** A day's name, and its short form, in the reader's language. */
export const dayLabel = (key: DayKey, locale?: Locale) =>
  libWords(locale).daysLong[DAYS.findIndex(d => d.key === key)];
export const dayShort = (key: DayKey, locale?: Locale) =>
  libWords(locale).daysShort[DAYS.findIndex(d => d.key === key)];

export type DayHours =
  | { mode: "hours"; open: string; close: string }
  | { mode: "24h" }
  | { mode: "closed" };

export type WeekHours = Record<DayKey, DayHours>;

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";

/** A sensible starting week: open Sunday–Thursday, closed for the weekend. */
export const defaultWeek = (): WeekHours =>
  DAYS.reduce((week, day) => {
    week[day.key] = day.key === "fri" || day.key === "sat"
      ? { mode: "closed" }
      : { mode: "hours", open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
    return week;
  }, {} as WeekHours);

const isTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseDay = (value: unknown): DayHours | null => {
  if (!value || typeof value !== "object") return null;
  const day = value as Record<string, unknown>;

  if (day.mode === "closed") return { mode: "closed" };
  if (day.mode === "24h") return { mode: "24h" };
  if (day.mode === "hours" && isTime(day.open) && isTime(day.close)) {
    return { mode: "hours", open: day.open, close: day.close };
  }
  return null;
};

/**
 * Reads whatever is in the column.
 *
 * Returns null for anything that is not a week — including the free text that
 * is in there today ("24/7 Emergency", "9am-5pm"). Null means "there is no
 * structured week here", which callers show as the old plain string rather
 * than throwing away what someone typed.
 */
export const parseWeek = (value: unknown): WeekHours | null => {
  let raw: unknown = value;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) return null;
    try { raw = JSON.parse(trimmed); } catch { return null; }
  }

  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const week = {} as WeekHours;
  let found = 0;

  for (const day of DAYS) {
    const parsed = parseDay(source[day.key]);
    if (parsed) found += 1;
    week[day.key] = parsed ?? { mode: "closed" };
  }

  // A stray object that happens to parse is not a week.
  return found > 0 ? week : null;
};

export const serialiseWeek = (week: WeekHours): string => JSON.stringify(week);

/** "09:00" → "9:00 AM". The stored value stays 24-hour; this is display only. */
export const formatTime = (value: string, locale?: Locale): string => {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const w = libWords(locale);
  const suffix = h < 12 ? w.am : w.pm;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const formatDay = (day: DayHours, locale?: Locale): string => {
  if (day.mode === "closed") return libWords(locale).closed;
  if (day.mode === "24h") return libWords(locale).open24;
  return `${formatTime(day.open, locale)} – ${formatTime(day.close, locale)}`;
};

const sameDay = (a: DayHours, b: DayHours): boolean => {
  if (a.mode !== b.mode) return false;
  if (a.mode === "hours" && b.mode === "hours") return a.open === b.open && a.close === b.close;
  return true;
};

/**
 * Collapses the week into the fewest rows that still say everything:
 * "Sun – Thu · 9:00 AM – 5:00 PM", "Fri – Sat · Closed".
 *
 * The week is a CYCLE, so a run is allowed to wrap past Saturday into Sunday.
 * A hospital closed only on Friday works Saturday through Thursday — one run,
 * not "Sun – Thu" plus a stray "Saturday" saying the same thing.
 *
 * Rows are listed starting from the run Sunday belongs to, so the ordering is
 * stable and the working week leads.
 */
export const summariseWeek = (week: WeekHours, locale?: Locale): { days: string; hours: string }[] => {
  const n = DAYS.length;

  // Walk backwards from Sunday for as long as the previous day matches. That
  // lands on the first day of the run Sunday is part of, wrapping past
  // Saturday when the run crosses the end of the week. If every day matches,
  // no break exists and the whole week is one run starting at Sunday.
  let start = 0;
  for (let step = 0; step < n; step += 1) {
    const current = (n - step) % n;
    const previous = (current - 1 + n) % n;
    if (!sameDay(week[DAYS[current].key], week[DAYS[previous].key])) {
      start = current;
      break;
    }
  }

  // Rotated so the wrap is already handled and grouping is a plain scan.
  const order = Array.from({ length: n }, (_, i) => DAYS[(start + i) % n]);

  const rows: { days: string; hours: string }[] = [];
  let runStart = 0;

  for (let i = 0; i < n; i += 1) {
    const next = order[i + 1];
    if (next && sameDay(week[order[i].key], week[next.key])) continue;

    const from = order[runStart];
    const to = order[i];
    rows.push({
      days: runStart === i ? dayLabel(from.key, locale) : `${dayShort(from.key, locale)} – ${dayShort(to.key, locale)}`,
      hours: formatDay(week[from.key], locale),
    });
    runStart = i + 1;
  }

  return rows;
};
