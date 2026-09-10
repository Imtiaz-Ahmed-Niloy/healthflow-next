/**
 * When a doctor sees patients, read from `doctors.availability`.
 *
 * That column is free text typed on /admin/doctors — "Sun–Thu, 9am–5pm",
 * "Sat - Wed, 9:00 AM - 3:00 PM" — and it is the only availability the data
 * actually holds: doctor_shifts (0012) is structured but empty for every
 * doctor. So this reads the text, in the shapes it is actually written in:
 *
 *   <day>[–<day>], <time>–<time>      a day or a day range, then hours
 *
 * Ranges wrap the week (Sat–Wed is Sat, Sun, Mon, Tue, Wed). A time without
 * am/pm borrows the other end's. Text this cannot read returns null, and a
 * null schedule is not enforced — refusing every booking for a doctor whose
 * hours were typed unusually would be worse than not checking them.
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

export type Schedule = {
  days: Day[];
  /** HH:MM, 24-hour. */
  start: string;
  /** HH:MM, 24-hour. */
  end: string;
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

export const parseAvailability = (text: string | null | undefined): Schedule | null => {
  if (!text) return null;
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

  return { days, start: hhmm(start), end: hhmm(end) };
};

/** The weekday of a YYYY-MM-DD calendar date — no timezone can move it. */
const weekdayOf = (date: string): Day => DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** "9:00 AM" from "09:00". */
export const displayTime = (hhmmValue: string) => {
  const [h, m] = hhmmValue.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

/** "Sun–Thu" from the parsed days, for messages. */
const dayRangeLabel = (days: Day[]) =>
  days.length === 1 ? days[0] : `${days[0]}–${days[days.length - 1]}`;

/**
 * Why this doctor can't be booked at this date and time, or null when they
 * can. A schedule that could not be read (null) never refuses anything.
 * The end of the hours is exclusive: a 9am–5pm doctor takes a 4:30 booking,
 * not a 5:00 one.
 */
export const outsideAvailabilityReason = (
  schedule: Schedule | null,
  date: string,
  time: string,
  doctorName = "The doctor",
) => {
  if (!schedule) return null;
  const day = weekdayOf(date);
  if (!schedule.days.includes(day)) {
    return `${doctorName} doesn't see patients on ${DAY_NAMES[day]}. Available ${dayRangeLabel(schedule.days)}.`;
  }
  const t = time.slice(0, 5);
  if (t < schedule.start || t >= schedule.end) {
    return `${doctorName} sees patients between ${displayTime(schedule.start)} and ${displayTime(schedule.end)}.`;
  }
  return null;
};
