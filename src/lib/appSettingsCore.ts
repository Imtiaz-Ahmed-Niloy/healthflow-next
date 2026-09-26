import type { Locale } from "@/i18n/config";
import { libWords } from "@/i18n/libText";

/**
 * The settings store and the formatters, without the React hooks.
 *
 * Kept apart from src/lib/appSettings.ts so server code (route handlers, via
 * src/lib/payroll.ts) can format money and dates: importing a module that
 * pulls in useSyncExternalStore into a route fails the production build.
 * Client code keeps importing from appSettings, which re-exports all of this.
 */

export type AppSettings = {
  timezone: string;
  language: string; // i18n code: "en" | "bn"
  dateFormat: string; // token format
  timeFormat: "12h" | "24h";
  currency: "USD" | "BDT" | "GBP";
};

const KEY = "app-settings-v1";
const EVT = "app-settings-change";

/**
 * The last resort, used before the platform's settings have arrived and if
 * they never do. The timezone is the browser's own, which is the only guess
 * available offline that is ever right.
 */
export const DEFAULTS: AppSettings = {
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  language: "en",
  dateFormat: "MMM DD, YYYY",
  timeFormat: "12h",
  currency: "USD",
};

/**
 * Three layers, and the order is the whole point:
 *
 *   DEFAULTS   what to render before anything has loaded
 *   platform   /super/global-settings, applied to everyone
 *   chosen     what THIS person picked in Settings
 *
 * Only the keys someone actually changed are stored, so a super admin moving
 * the platform to Dhaka moves everyone who never picked a timezone and nobody
 * who did. Storing the whole merged object — which is what this used to do —
 * made every key an override the moment one of them was touched.
 */
let platform: Partial<AppSettings> = {};

const readChosen = (): Partial<AppSettings> => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
  } catch {
    return {};
  }
};

let chosen: Partial<AppSettings> = typeof window === "undefined" ? {} : readChosen();

const merge = (): AppSettings => ({ ...DEFAULTS, ...platform, ...chosen });

let current: AppSettings = merge();

const subs = new Set<() => void>();

/** For useSyncExternalStore in appSettings.ts. */
export const subscribeAppSettings = (fn: () => void) => {
  subs.add(fn);
  const handler = () => fn();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    subs.delete(fn);
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
};

export const getAppSettings = () => current;

// The language itself isn't switched here: it's a cookie the server renders
// by (src/i18n). `language` stays in these settings as the platform default,
// which PlatformSettings applies to a browser that never picked one.
const publish = () => {
  current = merge();
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
  subs.forEach(fn => fn());
};

/** One person's own choice. Persisted, and it wins over the platform. */
export const setAppSettings = (patch: Partial<AppSettings>) => {
  chosen = { ...chosen, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(chosen)); } catch { /* ignore */ }
  publish();
};

/** Back to the platform's defaults for every key, as if nothing was ever set. */
export const clearAppSettings = () => {
  chosen = {};
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  publish();
};

/**
 * What /super/global-settings says. Applied under anything this person chose,
 * so it changes their view only where they have no opinion of their own.
 */
export const setPlatformDefaults = (patch: Partial<AppSettings>) => {
  platform = { ...platform, ...patch };
  publish();
};

/** The platform's default language, once /super/global-settings has loaded. */
export const platformLanguage = () => platform.language;

/** The platform's timezone, once /super/global-settings has loaded. */
export const platformTimezone = () => platform.timezone;

// ---- Format helpers ----

/**
 * All English locales, taka included.
 *
 * BDT used to format under `bn-BD`, which renders Bengali numerals — an amount
 * came out as ১,২৫০.৫০, digits nobody reading an English panel can scan. The
 * locale decides the digits and the grouping; the currency is a separate
 * argument, so English digits do not make the money less Bangladeshi.
 */
const CURRENCY_LOCALE: Record<AppSettings["currency"], string> = {
  USD: "en-US",
  BDT: "en-US",
  GBP: "en-GB",
};

/**
 * Taka is written as its code rather than ৳. The glyph is missing from several
 * of the fonts these panels fall back to, and renders as a box; "BDT 1,250.50"
 * is unambiguous everywhere. Dollar and pound keep their symbols — those are
 * ASCII and every font has them.
 */
const CURRENCY_DISPLAY: Record<AppSettings["currency"], "code" | "symbol"> = {
  USD: "symbol",
  BDT: "code",
  GBP: "symbol",
};

export const formatCurrency = (amount: number, s: AppSettings = current) => {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[s.currency], {
      style: "currency",
      currency: s.currency,
      currencyDisplay: CURRENCY_DISPLAY[s.currency],
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${s.currency} ${amount.toFixed(2)}`;
  }
};

export const currencySymbol = (s: AppSettings = current) =>
  ({ USD: "$", BDT: "BDT", GBP: "£" }[s.currency]);

const partsFor = (date: Date, tz: string) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, weekday: "long",
  });
  const map: Record<string, string> = {};
  dtf.formatToParts(date).forEach(p => { map[p.type] = p.value; });
  return map;
};

const EN_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A date in the settings' format. Month and weekday names come out in the
 * page's language (`locale`, English when left out); the digits stay Western
 * either way, for the reason CURRENCY_LOCALE gives.
 */
export const formatDate = (
  input: Date | string | number,
  s: AppSettings = current,
  fmt?: string,
  locale?: Locale,
) => {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";
  const p = partsFor(date, s.timezone);
  const w = libWords(locale);
  const YYYY = p.year;
  const MM = p.month;
  const DD = p.day;
  const MMM = w.monthsShort[parseInt(MM, 10) - 1];
  const dddd = w.daysLong[EN_WEEKDAYS.indexOf(p.weekday)] ?? p.weekday;
  const f = fmt ?? s.dateFormat;
  return f
    .replace("dddd", dddd)
    .replace("YYYY", YYYY)
    .replace("MMM", MMM)
    .replace("MM", MM)
    .replace("DD", DD);
};

export const formatTime = (input: Date | string | number, s: AppSettings = current) => {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: s.timezone, hour: "2-digit", minute: "2-digit", hour12: s.timeFormat !== "24h",
  }).format(date);
};

export const formatDateTime = (input: Date | string | number, s: AppSettings = current, locale?: Locale) =>
  `${formatDate(input, s, undefined, locale)} • ${formatTime(input, s)}`;
