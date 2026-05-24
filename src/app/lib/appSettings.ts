import { useEffect, useSyncExternalStore } from "react";
import i18n from "@/i18n";

export type AppSettings = {
  timezone: string;
  language: string; // i18n code: "en" | "bn"
  dateFormat: string; // token format
  currency: "USD" | "BDT" | "GBP";
};

const KEY = "app-settings-v1";
const EVT = "app-settings-change";

export const DEFAULTS: AppSettings = {
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  language: "en",
  dateFormat: "MMM DD, YYYY",
  currency: "USD",
};

const read = (): AppSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

let current: AppSettings = read();

const subs = new Set<() => void>();
const subscribe = (fn: () => void) => {
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

export const setAppSettings = (patch: Partial<AppSettings>) => {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  if (patch.language && patch.language !== i18n.language) i18n.changeLanguage(patch.language);
  window.dispatchEvent(new Event(EVT));
  subs.forEach(fn => fn());
};

export const useAppSettings = () =>
  useSyncExternalStore(subscribe, () => current, () => current);

// Sync i18n language with stored setting on load
if (typeof window !== "undefined" && current.language && i18n.language !== current.language) {
  i18n.changeLanguage(current.language).catch(() => { /* noop */ });
}

// ---- Format helpers ----

const CURRENCY_LOCALE: Record<AppSettings["currency"], string> = {
  USD: "en-US",
  BDT: "bn-BD",
  GBP: "en-GB",
};

export const formatCurrency = (amount: number, s: AppSettings = current) => {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[s.currency], {
      style: "currency",
      currency: s.currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${s.currency} ${amount.toFixed(2)}`;
  }
};

export const currencySymbol = (s: AppSettings = current) =>
  ({ USD: "$", BDT: "৳", GBP: "£" }[s.currency]);

const pad = (n: number) => String(n).padStart(2, "0");

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

const SHORT_MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const formatDate = (
  input: Date | string | number,
  s: AppSettings = current,
  fmt?: string,
) => {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";
  const p = partsFor(date, s.timezone);
  const YYYY = p.year;
  const MM = p.month;
  const DD = p.day;
  const MMM = SHORT_MONTH[parseInt(MM, 10) - 1];
  const dddd = p.weekday;
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
    timeZone: s.timezone, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(date);
};

export const formatDateTime = (input: Date | string | number, s: AppSettings = current) =>
  `${formatDate(input, s)} • ${formatTime(input, s)}`;

// Convenience hook returning live settings + bound formatters
export const useFormatters = () => {
  const s = useAppSettings();
  return {
    settings: s,
    formatCurrency: (n: number) => formatCurrency(n, s),
    formatDate: (d: Date | string | number, fmt?: string) => formatDate(d, s, fmt),
    formatTime: (d: Date | string | number) => formatTime(d, s),
    formatDateTime: (d: Date | string | number) => formatDateTime(d, s),
    currencySymbol: () => currencySymbol(s),
  };
};

// Optional: ensure language stays in sync if changed elsewhere
export const useSyncLanguage = () => {
  const s = useAppSettings();
  useEffect(() => {
    if (i18n.language !== s.language) i18n.changeLanguage(s.language);
  }, [s.language]);
};
