import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/dashboard
 *
 * Every number on the hospital-admin Executive Dashboard, in one response.
 * Sibling of /api/v1/super/dashboard — same shape of problem, one tenant
 * instead of the whole platform.
 *
 * Outside createResourceRoute on purpose, same reasoning as the super admin
 * dashboard: this is an aggregate over several tables, not CRUD on one.
 *
 * Every field here is derived from real rows. Nothing is estimated, and the
 * numbers the schema cannot answer yet are absent rather than faked:
 *
 *   revenue, pharmacy sales, lab reports, ICU occupancy, department
 *   performance, emergency alerts   no billing/lab/incident tables exist yet
 *
 * The dashboard should drop those tiles rather than invent them — same call
 * HF-36 made for the super admin side.
 *
 * Reads through the user-scoped client, so RLS still applies. A
 * hospital_admin's policy is scoped to their own tenant, which is what makes
 * these counts belong to one hospital — the service-role client is not
 * needed and is not used.
 */

const ADMIN_ROLES: AppRole[] = [
  "hospital_admin",
  "hr_admin",
  "finance_admin",
  "lab_admin",
  "pharmacy_admin",
];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !ADMIN_ROLES.includes(auth.role)) {
    return fail("Not allowed", 403);
  }

  const supabase = await createServerSupabase();

  // head: true asks Postgres for the count and no rows at all, so a tile
  // costs a count and nothing else.
  const today = new Date().toISOString().slice(0, 10);

  const [patients, activeDoctors, availableBeds, totalBeds, upcomingAppointments] =
    await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("doctors")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("beds")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabase.from("beds").select("id", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "scheduled")
        .gte("scheduled_date", today),
    ]);

  const firstError = [
    patients,
    activeDoctors,
    availableBeds,
    totalBeds,
    upcomingAppointments,
  ].find((result) => result.error)?.error;
  if (firstError) return fail(firstError.message, 400);

  return json({
    data: {
      patients: { total: patients.count ?? 0 },
      doctors: { active: activeDoctors.count ?? 0 },
      beds: { available: availableBeds.count ?? 0, total: totalBeds.count ?? 0 },
      appointments: { upcoming: upcomingAppointments.count ?? 0 },
    },
  });
};
