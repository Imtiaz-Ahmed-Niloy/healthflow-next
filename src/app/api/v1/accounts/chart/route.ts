import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * POST /api/v1/accounts/chart — gives a hospital the standard chart of
 * accounts, once.
 *
 * Not seeded into every tenant at migration time on purpose: a hospital that
 * keeps its books elsewhere should not open this page to find eighteen
 * accounts it never asked for. The function refuses if a chart already exists,
 * so this cannot double up.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const POST = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to write to the books", 403);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("seed_chart_of_accounts");

  if (error) return fail(error.message, 400);

  return json({ data }, 201);
};
