import type { Database } from "@/lib/supabase/types";

/**
 * The platform's defaults (0057) and the closed lists behind them.
 *
 * Shared by the API's Zod schema, the settings screen's pickers and the client
 * that applies them, so the three cannot drift: what the screen offers is what
 * the API accepts is what the check constraints allow.
 */

export type GlobalSettingsRow = Database["public"]["Tables"]["global_settings"]["Row"];

/**
 * Not every IANA zone — a picker with 400 entries is a search box pretending
 * to be a dropdown. These are the ones a Bangladeshi platform and its
 * neighbours actually run in, plus UTC for anyone who wants no opinion.
 */
export const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "Australia/Sydney",
  "UTC",
] as const;

/** Token strings, exactly as appSettings.formatDate reads them. */
export const DATE_FORMATS = ["MMM DD, YYYY", "DD MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;

export const TIME_FORMATS = ["12h", "24h"] as const;

/** The three appSettings can format. Adding one here means adding a locale there. */
export const CURRENCIES = ["USD", "BDT", "GBP"] as const;

/** i18n codes the app ships translations for. */
export const LANGUAGES = ["en", "bn"] as const;

export type Timezone = (typeof TIMEZONES)[number];
export type DateFormat = (typeof DATE_FORMATS)[number];
export type TimeFormat = (typeof TIME_FORMATS)[number];
export type Currency = (typeof CURRENCIES)[number];
export type Language = (typeof LANGUAGES)[number];

export const TIMEZONE_LABELS: Record<Timezone, string> = {
  "Asia/Dhaka": "Dhaka (BST)",
  "Asia/Kolkata": "Kolkata (IST)",
  "Asia/Karachi": "Karachi (PKT)",
  "Asia/Kathmandu": "Kathmandu (NPT)",
  "Asia/Dubai": "Dubai (GST)",
  "Asia/Singapore": "Singapore (SGT)",
  "Europe/London": "London (GMT/BST)",
  "America/New_York": "New York (ET)",
  "Australia/Sydney": "Sydney (AET)",
  UTC: "UTC",
};

/** Taka is labelled by its code, for the same reason it formats as one. */
export const CURRENCY_LABELS: Record<Currency, string> = {
  BDT: "Bangladeshi taka (BDT)",
  USD: "US dollar ($)",
  GBP: "Pound sterling (£)",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  bn: "বাংলা (Bangla)",
};

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  "12h": "12-hour (04:30 PM)",
  "24h": "24-hour (16:30)",
};
