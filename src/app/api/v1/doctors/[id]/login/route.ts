import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthContext } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret, decryptSecret, generatePassword } from "@/lib/credentials";

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

/**
 * `code` is for the one case the UI has to branch on rather than just print:
 * a doctor who has a login but no password we can show. See PUT.
 */
const fail = (message: string, status: number, code?: string) =>
  json({ error: { message, ...(code ? { code } : {}) } }, status);

/**
 * `super_admin` belongs here for the same reason it is in every RLS policy on
 * this schema: it operates the platform and can already read and edit these
 * doctors through /api/v1/doctors. Leaving it out did not protect anything —
 * it just made the key icon fail with "Not allowed" on every row for the one
 * role most likely to be clicking it while supporting a hospital.
 */
const ADMIN_ROLES = ["super_admin", "hospital_admin", "hr_admin"] as const;

/**
 * Loads the doctor through the user-scoped client, so a hospital_admin from
 * a different tenant gets a clean 404 from RLS rather than a 403 that
 * confirms the id exists at all.
 */
const loadDoctor = async (id: string) => {
  const supabase = await createServerSupabase();
  return supabase
    .from("doctors")
    .select("id, tenant_id, name, email, phone, profile_id, bmdc_number")
    .eq("id", id)
    .maybeSingle();
};

type Admin = ReturnType<typeof createAdminSupabase>;

/** ilike without its wildcards — `john_doe@` must not match `johnXdoe@`. */
const likeLiteral = (value: string) => value.trim().replace(/[\\%_]/g, "\\$&");

/**
 * A doctor is one person across hospitals (0077). Before minting a second
 * account, look for the one they already have: a doctor login under this
 * email, or a linked doctor row carrying the same BMDC number. Only an active
 * doctor account qualifies — an email that belongs to a patient or an admin
 * falls through to provisionUser, which refuses it as before.
 */
const findExistingDoctorLogin = async (
  admin: Admin,
  doctor: { email: string | null; bmdc_number: string | null },
) => {
  if (doctor.email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .ilike("email", likeLiteral(doctor.email))
      .maybeSingle();
    if (profile?.role === "doctor" && profile.is_active) return profile.id;
  }

  const bmdc = doctor.bmdc_number?.trim();
  if (bmdc) {
    const { data: rows } = await admin
      .from("doctors")
      .select("profile_id, profiles!doctors_profile_id_fkey ( role, is_active )")
      .ilike("bmdc_number", likeLiteral(bmdc))
      .not("profile_id", "is", null)
      .limit(5);
    const match = (rows ?? []).find(r => {
      const p = r.profiles as { role?: string; is_active?: boolean } | null;
      return p?.role === "doctor" && p.is_active;
    });
    if (match?.profile_id) return match.profile_id;
  }

  return null;
};

/** How many other hospitals this login is a doctor at, besides this row. */
const otherAffiliations = async (admin: Admin, profileId: string, doctorId: string) => {
  const { count } = await admin
    .from("doctors")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .neq("id", doctorId);
  return count ?? 0;
};

const sharedLoginMessage = (name: string) =>
  `${name} signs in with their own HealthFlow account, shared across every hospital they work at. The password is theirs — they can change it themselves, or use "Forgot password" on the sign-in page.`;

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

  const admin = createAdminSupabase();

  // Already a HealthFlow doctor somewhere? Link this row to them instead of
  // creating a duplicate person. The 0077 pull trigger copies their own name,
  // specialty, photo and the rest onto this row; the fee, availability and
  // status stay this hospital's.
  const existingProfileId = await findExistingDoctorLogin(admin, doctor);
  if (existingProfileId) {
    // Same hospital — or, for a row with no hospital (0081), a home row the
    // person already has: one home each.
    const sameScope = admin.from("doctors").select("id, name").eq("profile_id", existingProfileId);
    const { data: already } = await (doctor.tenant_id
      ? sameScope.eq("tenant_id", doctor.tenant_id)
      : sameScope.is("tenant_id", null)
    ).maybeSingle();
    if (already) {
      return fail(
        doctor.tenant_id
          ? `This login already belongs to ${already.name} on your doctor list. Remove this duplicate row instead.`
          : `${already.name} is already on HealthFlow with this email or BMDC number.`,
        409,
      );
    }

    const { data: linked, error: linkError } = await admin
      .from("doctors")
      .update({ profile_id: existingProfileId })
      .eq("id", id)
      .select("name, email")
      .single();
    if (linkError) return fail(`Could not link this doctor's existing account: ${linkError.message}`, 400);

    return json({ data: { linked: true, name: linked.name, email: linked.email } });
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

  // Encrypted before the profile is linked, on purpose. encryptSecret throws
  // when DOCTOR_LOGIN_ENCRYPTION_KEY is missing or the wrong length, and doing
  // it after the link is what leaves a doctor with a login nobody can read the
  // password for — the exact state three demo doctors were found in.
  const passwordEnc = encryptSecret(provisioned.password);

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
  // GET reports `no_saved_password` and the UI offers a reset, rather than the
  // login itself being lost. Upsert rather than insert so a retry after a
  // partial failure overwrites instead of hitting the primary key.
  const { error: secretError } = await admin.from("doctor_login_secrets").upsert(
    { doctor_id: id, tenant_id: doctor.tenant_id, password_enc: passwordEnc },
    { onConflict: "doctor_id" },
  );
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
  const { data: ownSecret, error: secretError } = await admin
    .from("doctor_login_secrets")
    .select("password_enc")
    .eq("doctor_id", id)
    .maybeSingle();

  if (secretError) return fail(secretError.message, 400);

  // A super admin sees the doctor as one person (0077): the password may be
  // filed against another hospital's row, or their home row (0081). A hospital
  // admin only ever gets the one its own row holds.
  let secret = ownSecret;
  if (!secret && auth.role === "super_admin") {
    const { data: siblings } = await admin.from("doctors").select("id").eq("profile_id", doctor.profile_id);
    const { data: found } = await admin
      .from("doctor_login_secrets")
      .select("password_enc")
      .in("doctor_id", (siblings ?? []).map(s => s.id))
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    secret = found;
  }

  // Linked from another hospital: this hospital never had the password, and
  // offering a reset would change the doctor's password everywhere. A super
  // admin may still reset it (see PUT), so they get the reset offer instead.
  if (!secret && auth.role !== "super_admin" && (await otherAffiliations(admin, doctor.profile_id, id)) > 0) {
    return fail(sharedLoginMessage(doctor.name), 409, "shared_login");
  }
  if (!secret) {
    // Has a login (profile_id set) but no stored secret — provisioned before
    // this table existed, or the POST below failed after linking the profile.
    //
    // This used to be the end of the road: the button offered "view", view
    // said the password was unrecoverable, and there was nothing else to
    // click. The password genuinely cannot be recovered — only Supabase has
    // it, hashed — but it CAN be replaced, so the caller is told to offer
    // that instead of a dead end.
    return fail(
      "No password was saved for this login — it predates this feature, or saving it failed. It can't be recovered, but it can be reset.",
      404,
      "no_saved_password",
    );
  }

  return json({ data: { email: doctor.email, password: decryptSecret(secret.password_enc) } });
};

/**
 * PUT — replaces the password of a doctor who already has a login.
 *
 * The recovery path for `no_saved_password`, and the only way out of it. This
 * genuinely CHANGES the doctor's password, so anything they memorised stops
 * working; the UI confirms before calling it.
 *
 * Writes the secret before touching Supabase Auth would be the wrong order —
 * the stored password has to match the live one, so Auth is the source of
 * truth and is updated first. If the upsert then fails, the response says so
 * plainly rather than handing back a password we did not manage to record.
 */
export const PUT = async (_request: Request, context: RouteContext) => {
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
  const isSuper = auth.role === "super_admin";

  // One hospital resetting the password would lock the doctor out of the
  // account they use at every other one. A super admin answers for the whole
  // platform and may — and then nobody holds a stale copy (below).
  if (!isSuper && (await otherAffiliations(admin, doctor.profile_id, id)) > 0) {
    return fail(sharedLoginMessage(doctor.name), 409, "shared_login");
  }

  const password = generatePassword(12);

  // Encrypt first: if the key is missing or wrong this throws, and it is much
  // better to throw before changing the live password than after.
  const passwordEnc = encryptSecret(password);

  const { error: authError } = await admin.auth.admin.updateUserById(doctor.profile_id, {
    password,
  });
  if (authError) return fail(`Could not reset the password: ${authError.message}`, 400);

  // The old password saved against the doctor's other rows is now wrong.
  // Removed, so no hospital's key button shows a password that no longer works.
  if (isSuper) {
    const { data: siblings } = await admin.from("doctors").select("id").eq("profile_id", doctor.profile_id).neq("id", id);
    const ids = (siblings ?? []).map(s => s.id);
    if (ids.length) await admin.from("doctor_login_secrets").delete().in("doctor_id", ids);
  }

  const { error: secretError } = await admin
    .from("doctor_login_secrets")
    .upsert(
      { doctor_id: id, tenant_id: doctor.tenant_id, password_enc: passwordEnc },
      { onConflict: "doctor_id" },
    );
  if (secretError) {
    return fail(
      `The password was reset to a new value, but saving it failed: ${secretError.message}. Copy it now — it is ${password} — or press reset again.`,
      500,
    );
  }

  return json({ data: { email: doctor.email, password } });
};
