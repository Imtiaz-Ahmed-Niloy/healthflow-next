import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { nowTimeIn, pastSlotReason, todayIn } from "@/lib/timezone";
import {
  currencySymbol,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  getAppSettings,
  platformTimezone,
  subscribeAppSettings,
} from "@/lib/appSettingsCore";

// The store and formatters live in appSettingsCore so server code can use
// them; this file adds the hooks on top. Client code imports from here.
export * from "@/lib/appSettingsCore";

export const useAppSettings = () =>
  useSyncExternalStore(subscribeAppSettings, getAppSettings, getAppSettings);

/**
 * The clock appointments are booked on: the platform timezone from global
 * settings, not the viewer's own override. A patient who set their panel to
 * London still books a Dhaka hospital on Dhaka's calendar. Falls back to the
 * merged setting only until the platform's has loaded.
 *
 * Re-renders when the platform settings arrive, through useAppSettings.
 */
export const useBookingClock = () => {
  const s = useAppSettings();
  const locale = useLocale();
  const timezone = platformTimezone() ?? s.timezone;
  return {
    timezone,
    /** YYYY-MM-DD, for a date input's `min`. */
    today: todayIn(timezone),
    /** HH:MM now, for a time input's `min` when the date is today. */
    nowTime: nowTimeIn(timezone),
    /** Null when the slot is bookable; otherwise a sentence to show, in the page's language. */
    pastSlotReason: (date: string, time: string) => pastSlotReason(date, time, timezone, new Date(), locale),
  };
};

// Convenience hook returning live settings + bound formatters, in the page's language.
export const useFormatters = () => {
  const s = useAppSettings();
  const locale = useLocale();
  return {
    settings: s,
    formatCurrency: (n: number) => formatCurrency(n, s),
    formatDate: (d: Date | string | number, fmt?: string) => formatDate(d, s, fmt, locale),
    formatTime: (d: Date | string | number) => formatTime(d, s),
    formatDateTime: (d: Date | string | number) => formatDateTime(d, s, locale),
    currencySymbol: () => currencySymbol(s),
  };
};
