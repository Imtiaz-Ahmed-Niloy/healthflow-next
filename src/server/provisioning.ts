import "server-only";

import { createAdminSupabase, type AppRole } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/credentials";

/**
 * Creates a login for someone who cannot create one themselves — a hospital
 * admin when their hospital is approved, a doctor when a hospital admin adds
 * them (HF-32).
 *
 * This is the one place in the codebase that creates auth users, deliberately.
 * It uses the service-role client, which bypasses RLS entirely, and `profiles`
 * has no insert policy for `authenticated` precisely so provisioning is forced
 * through here rather than reinvented per module.
 *
 * Role and tenant are passed as user metadata, NOT written to `profiles` here.
 * The `handle_new_user` trigger (0006) reads that metadata and inserts the
 * profile in the same transaction as the auth user, and raises if a non-patient
 * role arrives without a tenant. So there is no window where a user exists
 * without a correct profile, and therefore nothing to compensate for: if
 * createUser resolves, the profile is already right.
 *
 * Callers must have authorised the request themselves. This does no permission
 * checking.
 */

export type ProvisionResult =
  | { ok: true; userId: string; email: string; password: string }
  | { ok: false; code: "email_taken" | "failed"; message: string };

type ProvisionInput = {
  email: string;
  role: AppRole;
  /** Required for every role except super_admin and patient — see 0006. */
  tenantId: string | null;
  fullName?: string | null;
  phone?: string | null;
};

export const provisionUser = async ({
  email,
  role,
  tenantId,
  fullName = null,
  phone = null,
}: ProvisionInput): Promise<ProvisionResult> => {
  if (role !== "super_admin" && role !== "patient" && !tenantId) {
    return {
      ok: false,
      code: "failed",
      message: `Role ${role} requires a hospital, but none was given`,
    };
  }

  const admin = createAdminSupabase();
  const password = generatePassword(12);

  // Metadata keys must match what handle_new_user reads with ->>, and must be
  // strings: the trigger casts them itself.
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    // The address came from a super admin, not from the owner confirming it, so
    // there is no confirmation mail to wait on. They change the password on
    // first login.
    email_confirm: true,
    user_metadata: {
      role,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(fullName ? { full_name: fullName } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  if (error || !created?.user) {
    const message = error?.message ?? "Could not create the login";

    // Never fall back to attaching the existing user. If this address already
    // belongs to someone — a patient who signed up with it — granting them this
    // role would hand them an entire hospital.
    const taken = /already|exists|registered|duplicate/i.test(message);

    return {
      ok: false,
      code: taken ? "email_taken" : "failed",
      message: taken
        ? `${email} already has an account. Use a different address for this login.`
        : message,
    };
  }

  return { ok: true, userId: created.user.id, email, password };
};
