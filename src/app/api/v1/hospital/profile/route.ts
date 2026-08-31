import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { hospitalUpdateSchema } from "@/server/resources/hospitals";
import type { TablesUpdate } from "@/lib/supabase/types";

/**
 * /api/v1/hospital/profile — the signed-in admin's own hospital.
 *
 * Separate from the `hospitals` resource on purpose. That one is the super
 * admin's list: it reads for `hospital_admin` but writes for nobody else,
 * which is right for a screen that can create and delete hospitals. Widening
 * its write roles to let an admin edit their own row would also have let them
 * POST a new hospital and DELETE one — refused by RLS, but refused as a
 * database error rather than a clean 403.
 *
 * So this is the narrow version: one hospital, the caller's, read and update
 * only. It reuses the resource's own validation rather than restating forty
 * columns.
 *
 * Runs on the caller's client. `tenants_update` (0002) already says a
 * hospital_admin may update the tenant whose id matches their JWT and no
 * other, so RLS is the boundary and this route does not re-implement it.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const requireHospitalAdmin = async () => {
  const auth = await getAuthContext();
  if (!auth) return { error: fail("Not signed in", 401) } as const;
  if (auth.role !== "hospital_admin") {
    return { error: fail("Only a hospital admin can edit their hospital", 403) } as const;
  }
  if (!auth.tenantId) {
    return { error: fail("Your account is not attached to a hospital", 409) } as const;
  }
  return { auth, tenantId: auth.tenantId } as const;
};

export const GET = async () => {
  const guard = await requireHospitalAdmin();
  if ("error" in guard) return guard.error;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", guard.tenantId)
    .maybeSingle();

  if (error) return fail(error.message, 400);
  if (!data) return fail("Hospital not found", 404);
  return json({ data });
};

export const PATCH = async (request: Request) => {
  const guard = await requireHospitalAdmin();
  if ("error" in guard) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = hospitalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Those details are not valid", 422);
  }

  // Only the fields actually sent. Built key by key rather than with
  // Object.fromEntries, which erases the key types.
  const updates: TablesUpdate<"tenants"> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) (updates as Record<string, unknown>)[key] = value;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tenants")
    .update(updates)
    // Scoped by the JWT's tenant, never by anything the client sent. RLS says
    // the same thing; both are cheap.
    .eq("id", guard.tenantId)
    .select("*")
    .maybeSingle();

  if (error) return fail(error.message, 400);
  if (!data) return fail("Hospital not found", 404);
  return json({ data });
};
