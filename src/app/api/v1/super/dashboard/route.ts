import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * GET /api/v1/super/dashboard
 *
 * Every number on the super admin dashboard, in one response.
 *
 * Outside createResourceRoute on purpose — that factory does CRUD over a single
 * table, and this is an aggregate over four. Fetching these through the list
 * endpoints instead would mean one request per tile, each pulling whole rows
 * (`tenants` alone has 50 columns) to read a single count off the metadata.
 *
 * Every field here is derived from real rows. Nothing is estimated, and the
 * numbers the schema cannot answer yet are absent rather than faked:
 *
 *   uptime           no monitoring source exists
 *   revenue history  no billing history is stored, only the current price
 *
 * The dashboard should drop those tiles rather than invent them.
 *
 * Reads through the user-scoped client, so RLS still applies. A super_admin's
 * policy spans every tenant, which is what makes these totals platform-wide —
 * the service-role client is not needed and is not used.
 */

type TenantStatus = Database["public"]["Enums"]["tenant_status"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** How many hospitals to list under "recently added". */
const RECENT_LIMIT = 5;

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();

  // head: true asks Postgres for the count and no rows at all, so a tile costs
  // a count and nothing else.
  const countHospitals = (status?: TenantStatus) => {
    const query = supabase.from("tenants").select("id", { count: "exact", head: true });
    return status ? query.eq("status", status) : query;
  };

  const [total, approved, pending, suspended, users, doctors, packages, recent] = await Promise.all([
    countHospitals(),
    countHospitals("approved"),
    countHospitals("pending"),
    countHospitals("suspended"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase.from("packages").select("id, name, price_monthly").order("price_monthly"),
    supabase
      .from("tenants")
      .select("id, name, slug, status, created_at, packages ( name )")
      .order("created_at", { ascending: false })
      // Same tiebreaker, same direction, as the hospitals list endpoint. Most
      // tenants share a created_at from the seed, so without this the two
      // screens sort the same rows differently and "Recent Tenants" disagrees
      // with Hospital Management (HF-36).
      .order("id", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  const firstError = [total, approved, pending, suspended, users, doctors, packages, recent].find(
    (result) => result.error,
  )?.error;
  if (firstError) return fail(firstError.message, 400);

  const recentRows = recent.data ?? [];

  // Second wave: both of these need results from the first.
  //
  // Plan distribution is one count per package rather than a group-by, because
  // the client cannot express GROUP BY. That is bounded by the number of plans
  // we sell — a handful — not by the number of hospitals.
  const planRows = packages.data ?? [];

  const [planCounts, unassigned, staff] = await Promise.all([
    Promise.all(
      planRows.map((plan) =>
        supabase
          .from("tenants")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .eq("package_id", plan.id),
      ),
    ),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .is("package_id", null),
    // One query for the staff of the five listed hospitals, tallied below.
    // Five separate counts would be five round trips for the same rows.
    recentRows.length
      ? supabase
          .from("profiles")
          .select("tenant_id")
          .in(
            "tenant_id",
            recentRows.map((row) => row.id),
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  const planError = planCounts.find((result) => result.error)?.error ?? unassigned.error ?? staff.error;
  if (planError) return fail(planError.message, 400);

  const plans = planRows.map((plan, index) => ({
    name: plan.name,
    hospitals: planCounts[index].count ?? 0,
    priceMonthly: plan.price_monthly,
  }));

  // Only approved hospitals are billed, so only they contribute. A plan with no
  // hospitals on it contributes nothing, which is why this sums counts rather
  // than prices.
  const mrr = plans.reduce((sum, plan) => sum + Number(plan.priceMonthly ?? 0) * plan.hospitals, 0);

  const staffPerHospital = new Map<string, number>();
  for (const row of staff.data ?? []) {
    if (!row.tenant_id) continue;
    staffPerHospital.set(row.tenant_id, (staffPerHospital.get(row.tenant_id) ?? 0) + 1);
  }

  return json({
    data: {
      hospitals: {
        total: total.count ?? 0,
        approved: approved.count ?? 0,
        pending: pending.count ?? 0,
        suspended: suspended.count ?? 0,
      },
      // Every profile on the platform, staff and patients alike.
      users: users.count ?? 0,
      doctors: doctors.count ?? 0,
      // Sum of the monthly price of every approved hospital's plan. `packages`
      // stores no currency, so the caller decides how to label this.
      mrr,
      plans: [...plans, { name: "No plan", hospitals: unassigned.count ?? 0, priceMonthly: null }],
      recent: recentRows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        plan: row.packages?.name ?? null,
        users: staffPerHospital.get(row.id) ?? 0,
        createdAt: row.created_at,
      })),
    },
  });
};
