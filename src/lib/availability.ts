import { DAYS as WEEK_DAYS, defaultWeek, parseWeek, type WeekHours } from "@/lib/hours";

/**
 * When a doctor sees patients, read from `doctors.availability`.
 *
 * The column holds one of two things:
 *
 *   - a week, as JSON — what the weekly editor on /admin/doctors and
 *     /super/doctors saves, the same shape as a hospital's operating hours
 *     (src/lib/hours.ts). Each day has its own hours, or none;
 *
 *   - free text, from before that editor existed, in the shapes it was
 *     actually typed in:
 *
 *       <day>[–<day>], <time>–<time>      a day or a day range, then hours
 *
 *     Ranges wrap the week (Sat–Wed is Sat, Sun, Mon, Tue, Wed). A time
 *     without am/pm borrows the other end's.
 *
 * Text this cannot read returns null, and a null schedule is not enforced —
 * refusing every booking for a doctor whose hours were typed unusually would be
 * worse than not checking them.
 *
 * Shared by the booking form and the API that re-checks it, so the two can
 * never disagree about whether a slot is open.
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
type Day = (typeof DAYS)[number];

const DAY_NAMES: Record<Day, string> = {
  Sun: "Sundays", Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays",
  Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays",
};

/** One day's hours. HH:MM, 24-hour; the end is exclusive, and "24:00" is midnight. */
export type Span = { start: string; end: string };

export type Schedule = {
  /** The days the doctor sees patients, Sunday first. */
  days: Day[];
  hours: Partial<Record<Day, Span>>;
};

const dayIndex = (token: string) =>
  DAYS.findIndex(d => d.toLowerCase() === token.slice(0, 3).toLowerCase());

/** "9am", "9:30 AM", "17:00", "5" → minutes past midnight, with the meridiem it had (if any). */
const readTime = (token: string) => {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*m?\.?$/i);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, meridiem: m[3]?.toLowerCase() as "a" | "p" | undefined };
};

const toMinutes = (t: { hour: number; minute: number }, meridiem: "a" | "p" | undefined) => {
  let hour = t.hour;
  if (meridiem === "p" && hour < 12) hour += 12;
  if (meridiem === "a" && hour === 12) hour = 0;
  return hour * 60 + t.minute;
};

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const fromDays = (days: Day[], span: Span): Schedule => ({
  days: DAYS.filter(d => days.includes(d)),
  hours: Object.fromEntries(days.map(d => [d, span])),
});

/** A week from the editor. A close at or before the open runs to midnight; 24 hours is the whole day. */
const fromWeek = (week: WeekHours): Schedule => {
  const days: Day[] = [];
  const hours: Partial<Record<Day, Span>> = {};
  WEEK_DAYS.forEach((wd, i) => {
    const day = week[wd.key];
    const d = DAYS[i];
    if (day.mode === "closed") return;
    days.push(d);
    hours[d] = day.mode === "24h"
      ? { start: "00:00", end: "24:00" }
      : { start: day.open, end: day.close > day.open ? day.close : "24:00" };
  });
  return { days, hours };
};

/** The old free text: "Sun–Thu, 9am–5pm". */
const fromText = (text: string): Schedule | null => {
  const normalised = text.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const comma = normalised.indexOf(",");
  if (comma < 0) return null;

  // Days: "Sun-Thu" or "Mon".
  const dayPart = normalised.slice(0, comma).split("-").map(s => s.trim()).filter(Boolean);
  const first = dayIndex(dayPart[0] ?? "");
  const last = dayPart.length > 1 ? dayIndex(dayPart[1]) : first;
  if (first < 0 || last < 0 || dayPart.length > 2) return null;
  const days: Day[] = [];
  for (let i = first; ; i = (i + 1) % 7) {
    days.push(DAYS[i]);
    if (i === last) break;
  }

  // Hours: "9am-5pm", "9:00 AM - 3:00 PM".
  const timePart = normalised.slice(comma + 1).split("-").map(s => s.trim()).filter(Boolean);
  if (timePart.length !== 2) return null;
  const from = readTime(timePart[0]);
  const to = readTime(timePart[1]);
  if (!from || !to) return null;

  // An end with no meridiem borrows the start's, and vice versa.
  const toMeridiem = to.meridiem ?? from.meridiem;
  let fromMeridiem = from.meridiem ?? to.meridiem;
  let start = toMinutes(from, fromMeridiem);
  const end = toMinutes(to, toMeridiem);
  // "9-5pm": borrowing pm made the start 21:00, after the end — it was 9am.
  if (!from.meridiem && start >= end && fromMeridiem === "p") {
    fromMeridiem = "a";
    start = toMinutes(from, fromMeridiem);
  }
  if (start >= end) return null;

  return fromDays(days, { start: hhmm(start), end: hhmm(end) });
};

export const parseAvailability = (text: string | null | undefined): Schedule | null => {
  if (!text) return null;
  const week = parseWeek(text);
  return week ? fromWeek(week) : fromText(text);
};

/**
 * The week the editor should open with: the stored week, or the old text
 * turned into one — so an existing "Sat–Wed, 9am–3pm" is not replaced by the
 * default the moment someone opens the form — or the default for a blank.
 */
export const weekFromAvailability = (text: unknown): WeekHours => {
  const week = parseWeek(text);
  if (week) return week;
  const schedule = typeof text === "string" ? fromText(text) : null;
  if (!schedule) return defaultWeek();
  return WEEK_DAYS.reduce((w, wd, i) => {
    const span = schedule.hours[DAYS[i]];
    w[wd.key] = span ? { mode: "hours", open: span.start, close: span.end } : { mode: "closed" };
    return w;
  }, {} as WeekHours);
};

/** The weekday of a YYYY-MM-DD calendar date — no timezone can move it. */
const weekdayOf = (date: string): Day => DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** "9:00 AM" from "09:00"; "midnight" for the end of a day that runs to it. */
export const displayTime = (hhmmValue: string) => {
  if (hhmmValue === "24:00") return "midnight";
  const [h, m] = hhmmValue.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

const spanLabel = (span: Span) =>
  span.start === "00:00" && span.end === "24:00" ? "all day" : `${displayTime(span.start)}–${displayTime(span.end)}`;

const sameSpan = (a: Span | undefined, b: Span | undefined) =>
  !!a && !!b && a.start === b.start && a.end === b.end;

/**
 * Consecutive days that share hours, as runs: "Sun–Thu", "Sat". The week is a
 * cycle, so Sat–Wed stays one run rather than splitting at Sunday.
 */
const runs = (schedule: Schedule, sameHours: boolean): { label: string; span: Span }[] => {
  const on = (i: number) => schedule.hours[DAYS[((i % 7) + 7) % 7]];
  // Day i continues the run of the day before it.
  const joins = (i: number) => {
    const a = on(i - 1);
    const b = on(i);
    return sameHours ? sameSpan(a, b) : !!a && !!b;
  };

  // Begin at a day that starts a run. None means every day is on and joined
  // to the one before — one run, the whole week.
  const start = [0, 1, 2, 3, 4, 5, 6].find(i => on(i) && !joins(i));
  if (start === undefined) {
    const first = on(0);
    return first ? [{ label: "every day", span: first }] : [];
  }

  const out: { label: string; span: Span }[] = [];
  for (let k = 0; k < 7;) {
    const i = start + k;
    const span = on(i);
    if (!span) { k += 1; continue; }
    let len = 1;
    while (k + len < 7 && on(i + len) && joins(i + len)) len += 1;
    const from = DAYS[i % 7];
    const to = DAYS[(i + len - 1) % 7];
    out.push({ label: len === 1 ? from : `${from}–${to}`, span });
    k += len;
  }
  return out;
};

/** "Sun–Thu 9:00 AM–5:00 PM · Sat 10:00 AM–2:00 PM", for messages and cards. */
export const describeSchedule = (schedule: Schedule) =>
  schedule.days.length === 0
    ? "no days at the moment"
    : runs(schedule, true).map(r => `${r.label} ${spanLabel(r.span)}`).join(" · ");

/**
 * How to show a doctor's availability anywhere a person reads it. A week is
 * described; free text is shown as typed, since that is what someone meant.
 */
export const availabilityLabel = (text: string | null | undefined): string | null => {
  if (!text) return null;
  const week = parseWeek(text);
  if (!week) return text;
  const schedule = fromWeek(week);
  return schedule.days.length ? describeSchedule(schedule) : "Not taking appointments";
};

/** The hours on a date, or null on a day off — for bounding a time picker. */
export const hoursOn = (schedule: Schedule | null, date: string): Span | null =>
  schedule && date ? schedule.hours[weekdayOf(date)] ?? null : null;

/**
 * Why this doctor can't be booked at this date and time, or null when they
 * can. A schedule that could not be read (null) never refuses anything.
 * The end of the hours is exclusive: a 9am–5pm doctor takes a 4:30 booking,
 * not a 5:00 one. With no time yet, only the day is checked.
 */
export const outsideAvailabilityReason = (
  schedule: Schedule | null,
  date: string,
  time: string,
  doctorName = "The doctor",
) => {
  if (!schedule) return null;
  const day = weekdayOf(date);
  const span = schedule.hours[day];
  if (!span) {
    if (schedule.days.length === 0) return `${doctorName} isn't taking appointments at the moment.`;
    const days = runs(schedule, false).map(r => r.label).join(", ");
    return `${doctorName} doesn't see patients on ${DAY_NAMES[day]}. Available ${days}.`;
  }
  if (!time) return null;
  const t = time.slice(0, 5);
  if (t < span.start || t >= span.end) {
    // Name the day only when the hours differ from day to day.
    const varies = runs(schedule, true).length > 1;
    return `${doctorName} sees patients between ${displayTime(span.start)} and ${displayTime(span.end)}${varies ? ` on ${DAY_NAMES[day]}` : ""}.`;
  }
  return null;
};
