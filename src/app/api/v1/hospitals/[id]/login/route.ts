import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthContext } from "@/lib/supabase/server";
import { encryptSecret, decryptSecret, generatePassword } from "@/lib/credentials";

/**
 * /api/v1/hospitals/:id/login (HF-73)
 *
 * GET re-reads the hospital admin's password; PUT replaces it. The mirror of
 * /api/v1/doctors/[id]/login, and it exists for the same reason: approve used
 * to return the password in its response and nowhere else, so closing that
 * modal lost it for good.
 *
 * There is deliberately no POST. A hospital's admin login is created by
 * approving the hospital, not here — a second way to provision one would let a
 * super admin create an admin for a hospital that is still pending, which is
 * exactly the gate approve exists to be. When no admin exists this says so and
 * points at approve — see `noAdminError` for why that needs two sentences.
 *
 * Uses the service-role client throughout: hospital_admin_secrets has RLS on
 * and no policies at all, by design (0034).
 *
 * Nested under the same segment as hospitals' [[...id]] catch-all — Next 15
 * scores segment specificity (static 0, dynamic 1, catch-all 2), so
 * `[id]/login` resolves ahead of `[[...id]]`, same as [id]/approve.
 */

type RouteContext = {
  // Next 15: params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, code?: string) =>
  json({ error: { message, ...(code ? { code } : {}) } }, status);

/**
 * Only super_admin. Unlike doctors — where the hospital's own admins manage
 * their staff — a hospital's admin credentials are platform-level: this screen
 * is /super/hospitals, and a hospital_admin reading it would be reading their
 * own login, or worse, another hospital's.
 */
const requireSuperAdmin = async () => {
  const auth = await getAuthContext();
  if (!auth) return { ok: false as const, res: fail("Not signed in", 401) };
  if (auth.role !== "super_admin") return { ok: false as const, res: fail("Not allowed", 403) };
  return { ok: true as const };
};

/**
 * "There is no login" reads differently depending on how the hospital got here.
 *
 * A pending hospital has simply not been approved yet, and Approve is right
 * there on its row. An APPROVED hospital with no admin is the awkward case:
 * every hospital seeded straight into `tenants` with status 'approved' skipped
 * the approve route, so it never got provisioned — and its row shows the key
 * icon rather than Approve, so "approve it" pointed at a button that is not on
 * screen. Both are recoverable through the same idempotent approve endpoint;
 * the code tells the UI which sentence, and which offer, to make.
 */
const noAdminError = (name: string, status: string | null) =>
  status === "approved"
    ? fail(
        `${name} is approved but has no admin login — it was approved without one being created. It can be created now.`,
        404,
        "no_admin_login",
      )
    : fail(
        `${name} has no admin login yet. Approving the hospital creates one.`,
        404,
        "not_approved",
      );

/** The hospital, plus whoever holds its hospital_admin profile (if anyone). */
const loadHospital = async (id: string) => {
  const admin = createAdminSupabase();

  const { data: hospital, error } = await admin
    .from("tenants")
    .select("id, name, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !hospital) return { hospital: null, adminProfile: null, error };

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("tenant_id", id)
    .eq("role", "hospital_admin")
    .limit(1)
    .maybeSingle();

  return { hospital, adminProfile, error: null };
};

export const GET = async (_request: Request, context: RouteContext) => {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;

  const { id } = await context.params;
  if (!id) return fail("Hospital id is required", 400);

  const { hospital, adminProfile, error } = await loadHospital(id);
  if (error) return fail(error.message, 400);
  if (!hospital) return fail("Hospital not found", 404);

  if (!adminProfile) return noAdminError(hospital.name, hospital.status);

  const admin = createAdminSupabase();
  const { data: secret, error: secretError } = await admin
    .from("hospital_admin_secrets")
    .select("email, password_enc")
    .eq("tenant_id", id)
    .maybeSingle();

  if (secretError) return fail(secretError.message, 400);
  if (!secret) {
    // Approved before this table existed, which is every hospital approved
    // before HF-73. The password cannot be recovered — only Supabase has it,
    // hashed — but it can be replaced, so the caller is told to offer that.
    return fail(
      "No password was saved for this login — the hospital was approved before it was possible to store one. It can't be recovered, but it can be reset.",
      404,
      "no_saved_password",
    );
  }

  return json({
    data: { hospital: hospital.name, email: secret.email, password: decryptSecret(secret.password_enc) },
  });
};

/**
 * PUT — replaces the hospital admin's password.
 *
 * Genuinely changes it, so whoever is using the old one is locked out; the UI
 * confirms first. Auth is updated before the secret is written because Auth is
 * the source of truth — a stored password that does not match the live one is
 * worse than no stored password, since it looks authoritative.
 */
export const PUT = async (_request: Request, context: RouteContext) => {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;

  const { id } = await context.params;
  if (!id) return fail("Hospital id is required", 400);

  const { hospital, adminProfile, error } = await loadHospital(id);
  if (error) return fail(error.message, 400);
  if (!hospital) return fail("Hospital not found", 404);

  if (!adminProfile) return noAdminError(hospital.name, hospital.status);
  if (!adminProfile.email) {
    return fail("That admin profile has no email address, so its login can't be reset.", 422);
  }

  const password = generatePassword(12);

  // Encrypted first: this throws when the encryption key is missing or the
  // wrong length, and throwing before the live password changes is much better
  // than after — that is how a login nobody can read is created.
  const passwordEnc = encryptSecret(password);

  const admin = createAdminSupabase();

  const { error: authError } = await admin.auth.admin.updateUserById(adminProfile.id, { password });
  if (authError) return fail(`Could not reset the password: ${authError.message}`, 400);

  const { error: secretError } = await admin
    .from("hospital_admin_secrets")
    .upsert(
      { tenant_id: id, email: adminProfile.email, password_enc: passwordEnc },
      { onConflict: "tenant_id" },
    );
  if (secretError) {
    return fail(
      `The password was reset to a new value, but saving it failed: ${secretError.message}. Copy it now — it is ${password} — or press reset again.`,
      500,
    );
  }

  return json({ data: { hospital: hospital.name, email: adminProfile.email, password } });
};
