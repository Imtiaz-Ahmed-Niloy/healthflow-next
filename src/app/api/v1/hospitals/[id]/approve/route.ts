import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret } from "@/lib/credentials";

/**
 * POST /api/v1/hospitals/:id/approve
 *
 * Approves a hospital and provisions its hospital_admin login, returning the
 * credentials once.
 *
 * Outside createResourceRoute on purpose: it is an action rather than CRUD, it
 * needs the service-role client, and it must be safe to press twice.
 *
 * Nested under the same segment as the [[...id]] catch-all. Next 15 scores
 * segment specificity (static 0, dynamic 1, catch-all 2, optional catch-all 3,
 * lower wins), so `[id]/approve` resolves ahead of `[[...id]]`.
 */

type RouteContext = {
  // Next 15: params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const POST = async (_request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const { id } = await context.params;
  if (!id) return fail("Hospital id is required", 400);

  // Read through the user-scoped client so RLS still applies to the lookup.
  const supabase = await createServerSupabase();
  const { data: hospital, error: loadError } = await supabase
    .from("tenants")
    .select("id, name, status, contact_email, owner_email, owner_name, contact_phone")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return fail(loadError.message, 400);
  if (!hospital) return fail("Hospital not found", 404);

  const admin = createAdminSupabase();

  // Idempotency gate. If this hospital already has an admin, never mint a
  // second one — just make sure the status reflects reality. This is what makes
  // a double-click, or a retry after a half-finished attempt, harmless.
  const { data: existingAdmin, error: existingError } = await admin
    .from("profiles")
    .select("id, email")
    .eq("tenant_id", id)
    .eq("role", "hospital_admin")
    .limit(1)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 400);

  if (existingAdmin) {
    if (hospital.status !== "approved") {
      const { error } = await admin.from("tenants").update({ status: "approved" }).eq("id", id);
      if (error) return fail(error.message, 400);
    }

    return json({
      data: {
        hospital: hospital.name,
        status: "approved",
        alreadyProvisioned: true,
        email: existingAdmin.email,
      },
    });
  }

  const email = hospital.contact_email || hospital.owner_email;
  if (!email) {
    // Fail before touching auth rather than leaving a half-provisioned hospital.
    return fail(
      "This hospital has no contact email or owner email, so its admin login cannot be created. Add one and try again.",
      422,
    );
  }

  const provisioned = await provisionUser({
    email,
    role: "hospital_admin",
    tenantId: id,
    fullName: hospital.owner_name,
    phone: hospital.contact_phone,
  });

  if (!provisioned.ok) {
    return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 400);
  }

  // Stored before the status flip so the password is recoverable even if the
  // flip fails and the retry takes the "already provisioned" path above, which
  // never sees a password again. Encrypting here also throws before anything
  // else if the encryption key is missing, rather than after.
  //
  // A failure to store is NOT fatal: the login works, and HF-73's reset can
  // replace an unstored password. Losing the approval over it would be worse.
  const { error: secretError } = await admin.from("hospital_admin_secrets").upsert(
    { tenant_id: id, email: provisioned.email, password_enc: encryptSecret(provisioned.password) },
    { onConflict: "tenant_id" },
  );

  // Last, so a failure here leaves a working admin against a still-pending
  // hospital. The idempotency gate above turns the retry into a status flip.
  const { error: statusError } = await admin
    .from("tenants")
    .update({ status: "approved" })
    .eq("id", id);

  if (statusError) {
    return fail(
      `The admin login was created, but marking the hospital approved failed: ${statusError.message}. Press Approve again to finish.`,
      500,
    );
  }

  return json({
    data: {
      hospital: hospital.name,
      status: "approved",
      alreadyProvisioned: false,
      email: provisioned.email,
      password: provisioned.password,
      // Whether it can be read back later. False means the upsert above failed
      // and this really is the only time it will be shown, so the UI can say so
      // instead of promising a button that will not have it.
      saved: !secretError,
    },
  });
};
