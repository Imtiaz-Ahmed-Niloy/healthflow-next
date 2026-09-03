import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { homePathForRole, type AppRole } from "@/lib/auth/permissions";

/**
 * GET /auth/callback — where Google sends the browser back.
 *
 * This route exists because the session lives in COOKIES, not localStorage
 * (see src/lib/supabase/client.ts). That means the PKCE flow: Google returns a
 * one-time `code`, and only the server can exchange it for a session and write
 * the cookies that every Route Handler and RLS policy then reads. Doing it in
 * the browser would leave the app authenticated and the server anonymous.
 *
 * Nothing here creates a profile. `handle_new_user` (0006) fires on the insert
 * into auth.users — OAuth included — and defaults a public signup to
 * `patient` with no tenant, which is exactly right: staff accounts are
 * provisioned with a role and a hospital, never self-served. A staff member
 * whose email is already in the system keeps their real role, because the
 * account already exists and this only signs them in.
 */

const errorRedirect = (origin: string, message: string) =>
  NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(message)}`);

export const GET = async (request: Request) => {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  // Google's own refusal — the user closed the consent screen, or the app is
  // misconfigured. `error_description` is the readable half.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return errorRedirect(origin, providerError);
  if (!code) return errorRedirect(origin, "That sign-in link was incomplete. Try again.");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return errorRedirect(origin, error?.message ?? "Could not complete that sign-in.");
  }

  /**
   * Where to land. `next` is honoured only when it is a path on this site —
   * an absolute URL here would turn our own callback into an open redirect,
   * which is worth more to an attacker than it sounds.
   */
  const next = searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Otherwise the panel this person belongs in. Read from `profiles` rather
  // than assuming patient: an existing doctor or admin signing in with Google
  // must land in their own panel, and the middleware would bounce them out of
  // anywhere else anyway.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return NextResponse.redirect(`${origin}${homePathForRole(profile?.role as AppRole | null)}`);
};
