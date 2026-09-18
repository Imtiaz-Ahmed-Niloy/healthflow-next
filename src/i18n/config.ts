/**
 * The languages the app ships, and where a person's choice is kept.
 *
 * No locale in the URL: /doctors is /doctors in either language. The choice
 * lives in a cookie the server reads (src/i18n/request.ts), so a page comes
 * back already in Bangla or English — never English first and then swapped.
 */

export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** next-intl's own name for it. A year, on the whole site. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/** How each language names itself, for the switchers. */
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", bn: "বাংলা" };

/** The same, short, for a toggle in a top bar where the full names do not fit. */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = { en: "EN", bn: "বাং" };

/**
 * The page's language, read straight from the cookie.
 *
 * For the handful of plain functions that show text but are not components —
 * exportCSV, the printed payslip — where there is no hook to call. It lives
 * here rather than beside useChangeLocale so a server route importing the same
 * library does not pull React hooks in with it. Anything that renders should
 * use useLocale() instead.
 */
export const clientLocale = (): Locale => {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const value = document.cookie.split("; ").find(c => c.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
};
