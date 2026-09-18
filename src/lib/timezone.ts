/**
 * "Today" and "now" as a clock in a given timezone reads them.
 *
 * Not `new Date().toISOString()`, which is UTC: in Dhaka (UTC+6) that still
 * says yesterday until 6am, so a booking form built on it offered a date that
 * had already passed. And not the browser's own zone either — a booking runs
 * on the hospital's clock, which is the platform timezone in global settings.
 *
 * No dependencies, so the booking forms and the API that re-checks them use
 * the same arithmetic.
 */

import type { Locale } from "@/i18n/config";
import { libWords } from "@/i18n/libText";

const parts = (at: Date, timeZone: string) => {
  const map: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  })
    .formatToParts(at)
    .forEach(p => { map[p.type] = p.value; });
  return map;
};

/** YYYY-MM-DD for the date it is in `timeZone`. */
export const todayIn = (timeZone: string, at: Date = new Date()) => {
  const p = parts(at, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
};

/** HH:MM for the time it is in `timeZone`, 24-hour. */
export const nowTimeIn = (timeZone: string, at: Date = new Date()) => {
  const p = parts(at, timeZone);
  // Some engines still print midnight as "24" even with h23.
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
};

/**
 * Why a booking slot is not bookable, or null when it is. A date before
 * today, or earlier today than now, has already happened. Times compare as
 * HH:MM strings, which sort correctly when both are zero-padded.
 */
export const pastSlotReason = (date: string, time: string, timeZone: string, at: Date = new Date(), locale?: Locale) => {
  const today = todayIn(timeZone, at);
  if (date < today) return libWords(locale).datePassed;
  if (date === today && time.slice(0, 5) <= nowTimeIn(timeZone, at)) {
    return libWords(locale).timePassed;
  }
  return null;
};
