"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { clientLocale, isLocale } from "@/i18n/config";
import { hasLocaleCookie, saveProfileLanguage, writeLocaleCookie } from "@/i18n/useChangeLocale";

/**
 * Brings a signed-in person's language (profiles.language, 0123) into this
 * browser.
 *
 * Mounted once, beside PlatformSettings. When someone signs in — or arrives
 * already signed in — their saved language wins over whatever this browser
 * had, so a new machine switches to it right after login. If they have never
 * saved one, the language this browser was switched to becomes theirs; a
 * browser that never picked leaves the profile empty, so the platform default
 * keeps applying to them.
 *
 * Once per person per page load: after that the switchers write the cookie
 * and the profile together, and there is nothing left to reconcile.
 */
export const ProfileLanguage = () => {
  const router = useRouter();

  useEffect(() => {
    let syncedFor: string | null = null;

    const sync = async () => {
      const { data } = await supabase.auth.getClaims();
      const id = data?.claims?.sub;
      if (!id) {
        syncedFor = null;
        return;
      }
      if (syncedFor === id) return;
      syncedFor = id;

      // profiles_select_self (0002) allows exactly this one row.
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", id)
        .maybeSingle();
      if (!profile) return;

      const saved = profile.language;
      if (!isLocale(saved)) {
        if (hasLocaleCookie()) void saveProfileLanguage(clientLocale());
        return;
      }
      if (hasLocaleCookie() && saved === clientLocale()) return;

      writeLocaleCookie(saved);
      document.documentElement.lang = saved;
      router.refresh();
    };

    void sync();
    // Not awaited: a Supabase call awaited inside this callback deadlocks.
    const { data } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
};

export default ProfileLanguage;
