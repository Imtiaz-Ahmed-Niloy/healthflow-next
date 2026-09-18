import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";
import { MESSAGES } from "./messages";

/**
 * next-intl's per-request setup (found by the plugin in next.config.ts).
 *
 * The language comes from the cookie the switchers set, or English. Every
 * server render — and so every page's first paint — is in that language.
 */
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;

  return {
    locale,
    messages: MESSAGES[locale],
    // Fixed, so a date formatted on the server and again in the browser
    // comes out the same. Screens that format dates use useFormatters(),
    // which applies the platform's and the person's own timezone.
    timeZone: "Asia/Dhaka",
  };
});
