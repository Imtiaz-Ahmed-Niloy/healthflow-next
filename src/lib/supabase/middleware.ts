import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";
import type { AppRole } from "@/lib/auth/permissions";

/**
 * Refreshes the Supabase session on every request and reports who the caller
 * is, so middleware can gate routes.
 *
 * The cookie dance below is fiddly but not optional: tokens are refreshed
 * server-side, and the refreshed cookies have to be written onto the response
 * that is actually returned. Building a fresh NextResponse and forgetting to
 * copy the cookies over is the classic way to get a user silently logged out
 * every few minutes.
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the JWT signature. getSession() would read the
  // cookie without verifying it, so a forged cookie would be trusted.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const role = typeof claims?.user_role === "string" ? (claims.user_role as AppRole) : null;

  return {
    response,
    userId: typeof claims?.sub === "string" ? claims.sub : null,
    role,
    tenantId: typeof claims?.tenant_id === "string" ? claims.tenant_id : null,
  };
};
