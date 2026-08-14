import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { Constants } from "@/lib/supabase/types";

/**
 * GET /api/v1/super/role-stats
 *
 * How many users hold each role, platform-wide.
 *
 * Outside createResourceRoute for the same reason as the dashboard: the
 * factory does CRUD over one table's rows, and this is an aggregate. Reading
 * it through /api/v1/roles is not possible either — the count lives in
 * `profiles`, not `roles`.
 *
 * The Role Management screen used to show these numbers from a hardcoded seed
 * — patients read 11,873 whatever the database said. They are real counts now,
 * which is why the field is not editable in the UI: a role does not have a
 * user count, it has however many profiles currently point at it.
 *
 * One `head: true` count per role rather than a group-by, because the client
 * cannot express GROUP BY. Bounded by the size of the app_role enum — eight —
 * not by the number of users.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();
  const appRoles = Constants.public.Enums.app_role;

  const results = await Promise.all(
    appRoles.map((role) =>
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", role),
    ),
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) return fail(firstError.message, 400);

  // Keyed by enum value so the client can look a role up directly. Custom
  // roles are absent rather than zero — they cannot be held by anyone yet,
  // and a 0 would suggest they can be and simply are not.
  const counts = Object.fromEntries(
    appRoles.map((role, index) => [role, results[index].count ?? 0]),
  );

  return json({ data: counts });
};
