"use client";

import { useEffect } from "react";
import { Wrench } from "lucide-react";
import { useGetGlobalSettingsQuery } from "@/redux/api/superApi";
import { setPlatformDefaults, type AppSettings } from "@/lib/appSettings";

/**
 * Carries /super/global-settings (0057) into the running app.
 *
 * Mounted once, above everything, so the platform's timezone, clock format,
 * date format, currency and language are in place before any screen formats
 * anything. They land UNDER whatever this person chose for themselves — see
 * appSettings — so a super admin changing the platform moves the people who
 * never picked and nobody who did.
 *
 * It renders the maintenance notice too, because that is the other thing the
 * same row carries and it belongs on every panel rather than in each layout's
 * own copy of the same banner.
 *
 * The query is open to signed-out visitors, so this works on the public site
 * as well; if it fails, the app keeps the built-in defaults and says nothing.
 * A settings fetch is not something to interrupt anyone about.
 */
export const PlatformSettings = () => {
  const { data } = useGetGlobalSettingsQuery();
  const settings = data?.data;

  useEffect(() => {
    if (!settings) return;
    setPlatformDefaults({
      timezone: settings.timezone,
      language: settings.language,
      dateFormat: settings.date_format,
      timeFormat: settings.time_format as AppSettings["timeFormat"],
      currency: settings.currency as AppSettings["currency"],
    });
  }, [settings]);

  if (!settings?.maintenance_mode) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-yellow-100 px-4 py-2 text-center text-sm text-yellow-900 print:hidden"
    >
      <Wrench className="h-4 w-4 shrink-0" />
      <span className="font-semibold">Maintenance in progress.</span>
      <span>
        {settings.maintenance_message?.trim()
          || "Some things may be slower or briefly unavailable while we work."}
      </span>
      {settings.support_email && (
        <a href={`mailto:${settings.support_email}`} className="font-semibold underline">
          {settings.support_email}
        </a>
      )}
    </div>
  );
};

export default PlatformSettings;
