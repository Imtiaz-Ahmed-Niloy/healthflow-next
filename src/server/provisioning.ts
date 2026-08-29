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

    const taken = /already|exists|registered|duplicate/i.test(message);
    if (!taken) return { ok: false, code: "failed", message };

    // The address exists. Still never attach to a live account — if it belongs
    // to someone else, a patient who signed up with it, granting this role
    // would hand them an entire hospital. The one exception is an account this
    // system itself revoked (HF-75): a doctor who was removed from a hospital
    // and is now being hired again, here or somewhere else.
    const rehired = await rehireRevokedStaff({ admin, email, role, tenantId, password });
    if (rehired) return rehired;

    return {
      ok: false,
      code: "email_taken",
      message: `${email} already has an account. Use a different address for this login.`,
    };
  }

  return { ok: true, userId: created.user.id, email, password };
};

/**
 * The re-hire path, and the only way an existing account is ever reused.
 *
 * Returns a result when it applies, and `null` when it does not — the caller
 * then reports `email_taken` exactly as before. Every check here is a reason to
 * hand back null rather than a reason to raise, because "this is somebody
 * else's account" is the normal case, not an error.
 *
 * `restore_staff_access` re-checks the role and the revoked state inside the
 * transaction that does the write, so a profile reactivated between the lookup
 * and the update cannot slip through this.
 */
const rehireRevokedStaff = async ({
  admin,
  email,
  role,
  tenantId,
  password,
}: {
  admin: ReturnType<typeof createAdminSupabase>;
  email: string;
  role: AppRole;
  tenantId: string | null;
  password: string;
}): Promise<ProvisionResult | null> => {
  // A hospital's own staff are never patients or super admins, and those two
  // roles are the ones that could be sitting on a stranger's address.
  if (role === "patient" || role === "super_admin" || !tenantId) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active, tenant_id")
    .eq("email", email)
    .maybeSingle();

  // Not ours to reuse: no profile, still active, or a different job entirely.
  if (!profile || profile.is_active || profile.role !== role) return null;

  // A different hospital is not a re-hire this can serve. Changing tenant_id is
  // a super-admin-only write (0002's guard) and unpicking that needs the
  // profile <-> tenant membership table HF-75 defers. Falling through leaves the
  // existing `email_taken` refusal, which is the honest answer today.
  if (profile.tenant_id !== tenantId) return null;

  const { data: restored, error: restoreError } = await admin.rpc("restore_staff_access", {
    p_profile_id: profile.id,
    p_tenant_id: tenantId,
    p_role: role,
  });

  if (restoreError || !restored) return null;

  // Their old password is unknowable — only Supabase has it, hashed — and the
  // caller has to be able to hand the doctor something that works. Setting it
  // also re-confirms the address, in case the account predates email_confirm.
  const { error: passwordError } = await admin.auth.admin.updateUserById(profile.id, {
    password,
    email_confirm: true,
  });

  if (passwordError) {
    return {
      ok: false,
      code: "failed",
      message: `${email} was re-attached to this hospital, but setting a new password failed: ${passwordError.message}. Use the reset button.`,
    };
  }

  return { ok: true, userId: profile.id, email, password };
};
