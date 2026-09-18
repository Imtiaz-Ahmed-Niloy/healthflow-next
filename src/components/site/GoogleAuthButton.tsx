"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import { AUTH_NEXT_COOKIE, isSafeNext } from "@/lib/auth/authNext";

/**
 * Continue with Google — on sign-in and sign-up alike.
 *
 * Hands off to Google and comes back at /auth/callback, which is where the
 * session cookies are actually written — see that route for why the exchange
 * cannot happen in the browser. No profile is created here: the trigger on
 * auth.users (0006) makes a public signup a `patient` with no hospital, and
 * someone who already has an account simply signs in as who they are.
 *
 * `next` is where to land afterwards (a sign-in page's ?next=, say "back to
 * this doctor with the booking form open"). It rides in a short-lived cookie
 * rather than on the redirect URL: Supabase only returns to redirect URLs on
 * its allow-list, and a query string can stop one matching.
 */
export const GoogleAuthButton = ({ label, next, disabled = false, className = "" }: {
  label?: string;
  next?: string | null;
  disabled?: boolean;
  className?: string;
}) => {
  const t = useTranslations("auth.google");
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    if (isSafeNext(next)) {
      document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax`;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });

    // On success the browser is already on its way to Google; only a failure
    // gets this far.
    if (error) {
      setLoading(false);
      toast.error(error.message || t("failed"));
    }
  };

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={loading || disabled}
      className={`w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${className}`}
    >
      {/* Google's mark, in its own colours — their brand guidelines ask for
          this rather than a tinted letter G. */}
      <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.4z" />
        <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.8-5.4z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.6 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.1l-7.8 5.4C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {loading ? t("opening") : label ?? t("continue")}
    </button>
  );
};

export default GoogleAuthButton;
