import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthContext } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret, decryptSecret, easyPatientPassword } from "@/lib/credentials";
import { bdLocalPart, bdStoredPhone, isBdMobile, phoneLoginEmail, phoneOfLoginEmail } from "@/lib/phone";

/**
 * /api/v1/patients/:id/login
 *
 * POST gives a patient added at the desk a login: their mobile number, and a
 * short password made from their name and that number (easyPatientPassword).
 * /admin/patients calls it as soon as a patient is saved. GET reads the
 * password back, because the desk is asked for it again a week later.
 *
 * Outside createResourceRoute for the reasons doctors/[id]/login gives: it
 * creates an auth user, and patient_login_secrets (0124) has no RLS policy for
 * `authenticated`, so only the service-role client reaches it. `[id]/login`
 * resolves ahead of the `[[...id]]` catch-all beside it.
 *
 * There is no reset here. A hospital may read back a password it issued, and
 * nothing else — a patient who signed up themselves, or whose login another
 * hospital made, keeps a password no desk can see or replace.
 */

type RouteContext = {
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

/** `code` is for the cases the UI words itself rather than printing. */
const fail = (message: string, status: number, code?: string) =>
  json({ error: { message, ...(code ? { code } : {}) } }, status);

/** The roles that can write a patient (patientsResource), and the platform's own. */
const ADMIN_ROLES = ["super_admin", "hospital_admin", "hr_admin"] as const;

/**
 * Through the caller's own client, so another hospital's patient is a clean
 * 404 from RLS rather than a 403 that confirms the id exists.
 */
const loadPatient = async (id: string) => {
  const supabase = await createServerSupabase();
  return supabase
    .from("patients")
    .select("id, tenant_id, full_name, phone, profile_id")
    .eq("id", id)
    .maybeSingle();
};

type Admin = ReturnType<typeof createAdminSupabase>;

/**
 * The account this number already signs in with, if it has one.
 *
 * A phone login made at any desk comes first — the number IS that account.
 * Failing that, a patient who signed up themselves with this number, but only
 * when there is exactly one: this is the same match that links a walk-in
 * record when they book online (api/v1/patient/appointments), and two people
 * sharing a number is not a question to settle by picking one.
 */
const findAccountForPhone = async (admin: Admin, phone: string) => {
  const { data: desk } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "patient")
    .eq("is_active", true)
    .eq("email", phoneLoginEmail(phone))
    .maybeSingle();
  if (desk) return desk;

  // /signup keeps the number as it was typed, so all three spellings.
  const local = bdLocalPart(phone);
  const { data: own } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "patient")
    .eq("is_active", true)
    .in("phone", [`0${local}`, `880${local}`, `+880${local}`])
    .limit(2);
  return own?.length === 1 ? own[0] : null;
};

const authorise = async () => {
  const auth = await getAuthContext();
  if (!auth) return { response: fail("Not signed in", 401) };
  if (!auth.role || !ADMIN_ROLES.includes(auth.role as (typeof ADMIN_ROLES)[number])) {
    return { response: fail("Not allowed", 403) };
  }
  return { auth };
};

export const POST = async (_request: Request, context: RouteContext) => {
  const { response } = await authorise();
  if (response) return response;

  const { id } = await context.params;
  if (!id) return fail("Patient id is required", 400);

  const { data: patient, error: loadError } = await loadPatient(id);
  if (loadError) return fail(loadError.message, 400);
  if (!patient) return fail("Patient not found", 404);

  if (patient.profile_id) {
    return fail("This patient already has a login. Use the view button instead.", 409);
  }
  if (!patient.phone || !isBdMobile(patient.phone)) {
    return fail(
      "This patient has no mobile number on file, so a login can't be created. Add one and try again.",
      422,
      "no_phone",
    );
  }

  const phone = bdStoredPhone(patient.phone);
  const admin = createAdminSupabase();

  // The number already signs someone in: this record joins that account, and
  // their password stays theirs.
  const existing = await findAccountForPhone(admin, phone);
  if (existing) {
    // One record per person per hospital — the patient portal reads "my record
    // here" as a single row, and a second would break it.
    const { data: already } = await admin
      .from("patients")
      .select("id, full_name")
      .eq("tenant_id", patient.tenant_id)
      .eq("profile_id", existing.id)
      .limit(1)
      .maybeSingle();
    if (already) {
      return fail(
        `${phone} is already the login for ${already.full_name} at this hospital. A number can sign in as one patient here.`,
        409,
        "phone_in_use",
      );
    }

    const { error: linkError } = await admin
      .from("patients")
      .update({ profile_id: existing.id })
      .eq("id", id);
    if (linkError) return fail(`Could not link this patient's existing account: ${linkError.message}`, 400);

    return json({ data: { linked: true, login: phone } });
  }

  const password = easyPatientPassword(patient.full_name, phone);

  // Encrypted before anything is created: encryptSecret throws when the key is
  // missing, and a login nobody can read the password for is worse than none.
  let passwordEnc: string;
  try {
    passwordEnc = encryptSecret(password);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not encrypt the password", 500);
  }

  const provisioned = await provisionUser({
    email: phoneLoginEmail(phone),
    role: "patient",
    tenantId: null,
    fullName: patient.full_name,
    phone,
    password,
  });
  if (!provisioned.ok) {
    return fail(
      provisioned.code === "email_taken"
        ? `${phone} already has a login that can't be used here. Ask the patient to sign in with it, or use a different number.`
        : provisioned.message,
      provisioned.code === "email_taken" ? 409 : 400,
    );
  }

  const { error: linkError } = await admin
    .from("patients")
    .update({ profile_id: provisioned.userId })
    .eq("id", id);
  if (linkError) {
    return fail(`The login was created, but linking it to the patient failed: ${linkError.message}.`, 500);
  }

  const { error: secretError } = await admin.from("patient_login_secrets").upsert(
    { patient_id: id, tenant_id: patient.tenant_id, password_enc: passwordEnc },
    { onConflict: "patient_id" },
  );
  if (secretError) {
    return fail(
      `The login was created, but the password couldn't be saved for later viewing: ${secretError.message}. Copy it now — it is ${password}.`,
      500,
    );
  }

  return json({ data: { login: phone, password } });
};

export const GET = async (_request: Request, context: RouteContext) => {
  const { response } = await authorise();
  if (response) return response;

  const { id } = await context.params;
  if (!id) return fail("Patient id is required", 400);

  const { data: patient, error: loadError } = await loadPatient(id);
  if (loadError) return fail(loadError.message, 400);
  if (!patient) return fail("Patient not found", 404);

  if (!patient.profile_id) {
    return fail("This patient has no login yet. Use the create button instead.", 404);
  }

  const admin = createAdminSupabase();
  const { data: secret, error: secretError } = await admin
    .from("patient_login_secrets")
    .select("password_enc")
    .eq("patient_id", id)
    .maybeSingle();
  if (secretError) return fail(secretError.message, 400);

  // Their own account, or one another hospital's desk made.
  if (!secret) {
    return fail(
      `${patient.full_name} signs in with their own HealthFlow account. The password is theirs, and isn't kept here.`,
      409,
      "own_account",
    );
  }

  // The number they sign in with is the one the login was made under, which
  // stops being the one on the record the day somebody edits it.
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", patient.profile_id)
    .maybeSingle();

  return json({
    data: {
      login: phoneOfLoginEmail(profile?.email) ?? bdStoredPhone(patient.phone ?? ""),
      password: decryptSecret(secret.password_enc),
    },
  });
};
