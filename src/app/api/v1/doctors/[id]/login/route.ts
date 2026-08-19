import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthContext } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret, decryptSecret } from "@/lib/credentials";

/**
 * /api/v1/doctors/:id/login (HF-32)
 *
 * POST creates the doctor's login the first time. GET re-reads the password
 * on every later visit — the point of this endpoint existing at all is that
 * a hospital admin can come back for it, not just catch it once.
 *
 * Outside createResourceRoute on purpose, same reasoning as
 * hospitals/[id]/approve: this is an action with side effects (creates an
 * auth user), not CRUD on doctors itself, and it needs the service-role
 * client to reach doctor_login_secrets, which has no RLS policy for
 * `authenticated` at all.
 *
 * Nested under the same segment as doctors' [[...id]] catch-all — Next 15
 * scores segment specificity (static 0, dynamic 1, catch-all 2), so
 * `[id]/login` resolves ahead of `[[...id]]`, same as hospitals/[id]/approve.
 */

type RouteContext = {
  // Next 15: params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const ADMIN_ROLES = ["hospital_admin", "hr_admin"] as const;

/**
 * Loads the doctor through the user-scoped client, so a hospital_admin from
 * a different tenant gets a clean 404 from RLS rather than a 403 that
 * confirms the id exists at all.
 */
const loadDoctor = async (id: string) => {
  const supabase = await createServerSupabase();
  return supabase
    .from("doctors")
    .select("id, tenant_id, name, email, phone, profile_id")
    .eq("id", id)
    .maybeSingle();
};

export const POST = async (_request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ADMIN_ROLES.includes(auth.role as (typeof ADMIN_ROLES)[number])) {
    return fail("Not allowed", 403);
  }

  const { id } = await context.params;
  if (!id) return fail("Doctor id is required", 400);

  const { data: doctor, error: loadError } = await loadDoctor(id);
  if (loadError) return fail(loadError.message, 400);
  if (!doctor) return fail("Doctor not found", 404);

  if (doctor.profile_id) {
    return fail("This doctor already has a login. Use the view button instead.", 409);
  }

  if (!doctor.email) {
    // Fail before touching auth rather than leaving a half-provisioned doctor.
    return fail(
      "This doctor has no email on file, so a login can't be created. Add one and try again.",
      422,
    );
  }

  const provisioned = await provisionUser({
    email: doctor.email,
    role: "doctor",
    tenantId: doctor.tenant_id,
    fullName: doctor.name,
    phone: doctor.phone,
  });

  if (!provisioned.ok) {
    return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 400);
  }

  const admin = createAdminSupabase();

  const { error: linkError } = await admin
    .from("doctors")
    .update({ profile_id: provisioned.userId })
    .eq("id", id);
  if (linkError) {
    return fail(
      `The login was created, but linking it to the doctor failed: ${linkError.message}. Press Create again to finish.`,
      500,
    );
  }

  // Last, so a failure here still leaves a working, linked login — the next
  // GET would just fail to find a stored password, not the login itself.
  const { error: secretError } = await admin.from("doctor_login_secrets").insert({
    doctor_id: id,
    tenant_id: doctor.tenant_id,
    password_enc: encryptSecret(provisioned.password),
  });
  if (secretError) {
    return fail(
      `The login was created, but the password couldn't be saved for later viewing: ${secretError.message}.`,
      500,
    );
  }

  return json({ data: { email: provisioned.email, password: provisioned.password } });
};

export const GET = async (_request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ADMIN_ROLES.includes(auth.role as (typeof ADMIN_ROLES)[number])) {
    return fail("Not allowed", 403);
  }

  const { id } = await context.params;
  if (!id) return fail("Doctor id is required", 400);

  const { data: doctor, error: loadError } = await loadDoctor(id);
  if (loadError) return fail(loadError.message, 400);
  if (!doctor) return fail("Doctor not found", 404);

  if (!doctor.profile_id) {
    return fail("This doctor has no login yet. Use the create button instead.", 404);
  }

  const admin = createAdminSupabase();
  const { data: secret, error: secretError } = await admin
    .from("doctor_login_secrets")
    .select("password_enc")
    .eq("doctor_id", id)
    .maybeSingle();

  if (secretError) return fail(secretError.message, 400);
  if (!secret) {
    // Has a login (profile_id set) but no stored secret — provisioned before
    // this table existed, or the insert above failed on a past attempt.
    return fail(
      "This doctor has a login, but no password was saved for it — it predates this feature or wasn't saved. There's no way to recover it; the doctor can use \"forgot password\" instead.",
      404,
    );
  }

  return json({ data: { email: doctor.email, password: decryptSecret(secret.password_enc) } });
};
