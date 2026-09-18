"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LOCALE_COOKIE, type Locale } from "./config";

/** Saves the language for this browser: a year, the whole site. */
export const writeLocaleCookie = (locale: Locale) => {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
};

/** Whether this browser has ever picked a language (the platform default applies until it does). */
export const hasLocaleCookie = () =>
  typeof document !== "undefined" && document.cookie.split("; ").some(c => c.startsWith(`${LOCALE_COOKIE}=`));


/**
 * Switch the app's language — the navbar and panel switchers, and the
 * language preference in Settings. Writes the cookie and re-renders the
 * page on the server in the new language; nothing on the page is lost.
 */
export const useChangeLocale = () => {
  const router = useRouter();
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === current) return;
    writeLocaleCookie(next);
    document.documentElement.lang = next;
    startTransition(() => router.refresh());
  };

  return { locale: current, change, pending };
};
