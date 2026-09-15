/**
 * Where to land after a Google sign-in (see GoogleAuthButton and
 * /auth/callback): a short-lived cookie holding a path on this site.
 */
export const AUTH_NEXT_COOKIE = "hf_auth_next";

/** Only a path on this site — an absolute URL here would be an open redirect. */
export const isSafeNext = (next: string | null | undefined): next is string =>
  !!next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
