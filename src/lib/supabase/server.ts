import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * The identity of the caller, read from verified JWT claims.
 *
 * `role` and `tenantId` come from the custom access token hook
 * (supabase/migrations/0003_auth_claims_hook.sql), so reading them costs
 * nothing — no round trip to the profiles table.
 */
export type AuthContext = {
  userId: string;
  role: AppRole | null;
  tenantId: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Request-scoped client that acts AS THE SIGNED-IN USER.
 *
 * This is the one route handlers should use. Every query it runs is subject
 * to RLS, which is what makes tenant isolation hold even if a handler forgets
 * to filter by tenant_id.
 *
 * Note `cookies()` is awaited — in Next 15 it returns a Promise.
 */
export const createServerSupabase = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: middleware refreshes the session on navigation.
        }
      },
    },
  });
};

/**
 * Client that BYPASSES RLS entirely, using the secret key.
 *
 * Only for operations that legitimately cross tenants or run before a session
 * exists — hospital provisioning, creating auth users, seeding. Never reach
 * for this to "make a query work"; if a normal query is denied, the policy is
 * what needs fixing.
 */
export const createAdminSupabase = () => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from the Supabase dashboard " +
        "(Settings -> API Keys -> Secret keys) into .env.local.",
    );
  }

  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * Public, cookie-less client for reading published content on unauthenticated
 * pages (marketing site, blog, etc).
 *
 * Uses the publishable key, so RLS still applies — anon can only read rows
 * the public read policy allows. But because it never touches cookies, pages
 * that use it stay statically renderable, and `export const revalidate = N`
 * actually caches. `createServerSupabase()` would opt the page out of caching
 * the moment it reads a cookie.
 *
 * Do not use this for anything behind auth — it has no session context.
 */
export const createPublicSupabase = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * Verified identity of the caller, or null when not signed in.
 *
 * Uses getClaims(), which verifies the JWT signature. Do not swap this for
 * getSession() — that reads the cookie without verifying it, so a forged
 * cookie would be trusted.
 */
export const getAuthContext = async (): Promise<AuthContext | null> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const { sub, user_role: userRole, tenant_id: tenantId } = data.claims;

  return {
    userId: sub,
    role: typeof userRole === "string" ? (userRole as AppRole) : null,
    tenantId: typeof tenantId === "string" ? tenantId : null,
  };
};

export const isSuperAdmin = (auth: AuthContext | null) => auth?.role === "super_admin";
