import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, createAdminSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * POST /api/v1/patient/appointments (HF-50)
 *
 * A logged-in patient books a doctor. Outside createResourceRoute /
 * appointmentsResource on purpose — that resource deliberately excludes
 * `patient` from both read and write (see src/server/resources/appointments.ts),
 * because a patient does not get generic CRUD on the appointments table, only
 * this one narrow action.
 *
 * The real complication: `appointments.patient_id` is a required FK into
 * `patients`, a tenant-scoped table, but a self-signed-up patient's profile
 * has no tenant_id at all (0001_core_schema.sql — "patients are allowed to
 * exist before choosing one"). So before an appointment can be written, this
 * route has to resolve *which* patients row (in the doctor's hospital) this
 * login belongs to:
 *
 *   1. Already linked here before (profile_id matches in this tenant)? Use it.
 *   2. A walk-in/admission-desk record with a matching phone number exists in
 *      this tenant, with no login attached yet? Link it to this login. This is
 *      the phone-match auto-link Ridwan described for HF-51 — first booking is
 *      exactly when it needs to happen, so it lives here rather than as a
 *      separate step someone could skip.
 *   3. Neither? Create a fresh patients row in this tenant for this login.
 *
 * Runs on the service-role client for the patients/appointments writes: a
 * patient's own JWT tenant_id is null (or a different hospital entirely) until
 * step 1/2/3 resolves it, so the standard tenant RLS policy
 * (`tenant_id = auth_tenant_id()`) would reject a user-scoped insert even
 * though this is exactly the legitimate first booking it should allow.
 *
 * Double-booking (HF-53): enforced by a real unique index
 * (appointments_doctor_slot_unique, 0024) rather than a check-then-insert
 * here — a check here has a race window between two concurrent requests
 * that the database refusing the second INSERT outright does not. This
 * route only translates the resulting 23505 into a clean message. The same
 * index guards PATCH reschedule below for the same reason.
 *
 * GET lists everything this login has ever booked. PATCH does one of two
 * things depending on `action` (HF-52 cancel, HF-55 reschedule). A patient
 * can hold a `patients` row in more than one hospital (self-registered, then
 * booked again elsewhere — see the POST handler above), so both list across
 * every tenant this login is linked to rather than assuming one.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** Every patients.id this login is linked to, across every hospital. */
const patientIdsForUser = async (
  admin: ReturnType<typeof createAdminSupabase>,
  userId: string,
) => {
  const { data, error } = await admin.from("patients").select("id").eq("profile_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

const bookingSchema = z.object({
  doctor_id: z.string().uuid("Pick a doctor first."),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time."),
  department: z.string().trim().max(200).optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  notes: z.string().trim().max(2000).optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient") return fail("Only a patient can book their own appointment", 403);

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid booking details", 400);
  }
  const { doctor_id, scheduled_date, scheduled_time, department, notes } = parsed.data;

  // User-scoped client: doctors_public grants select to `authenticated`, and
  // this doubles as existence + "currently bookable" check (active doctor,
  // approved hospital) in one read, same shape as HF-49's doctor list.
  const supabase = await createServerSupabase();
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors_public")
    .select("id, tenant_id, name, specialty, hospital_name")
    .eq("id", doctor_id)
    .maybeSingle();

  if (doctorError) return fail(doctorError.message, 400);
  if (!doctor || !doctor.tenant_id) {
    return fail("This doctor isn't available for booking right now.", 404);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", auth.userId)
    .maybeSingle();
  if (profileError) return fail(profileError.message, 400);

  /**
   * What the patient has already entered about themselves (0066). Copied onto
   * the hospital record below, so a hospital starts from the details the
   * person gave rather than an empty file it has to ask for again.
   *
   * A copy, not a reference: a hospital's row is its own document of what it
   * was told and when. If the patient later corrects their blood group, the
   * hospital can see that on the personal profile — the correction does not
   * silently rewrite the hospital's own record.
   */
  const { data: personal } = await supabase
    .from("patient_profiles")
    .select("date_of_birth, gender, marital_status, national_id, address, blood_group, height_feet, height_inches, weight_kg, emergency_contact_name, emergency_contact_phone, emergency_contact_relation")
    .eq("profile_id", auth.userId)
    .maybeSingle();

  const admin = createAdminSupabase();

  // Step 1: already linked to this hospital.
  let patientId: string | null = null;
  {
    const { data, error } = await admin
      .from("patients")
      .select("id")
      .eq("tenant_id", doctor.tenant_id)
      .eq("profile_id", auth.userId)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    patientId = data?.id ?? null;
  }

  // Step 2: a walk-in record at this hospital with a matching phone number,
  // not yet linked to any login — link it to this one.
  if (!patientId && profile?.phone) {
    const { data, error } = await admin
      .from("patients")
      .select("id")
      .eq("tenant_id", doctor.tenant_id)
      .eq("phone", profile.phone)
      .is("profile_id", null)
      .maybeSingle();
    if (error) return fail(error.message, 500);

    if (data) {
      const { error: linkError } = await admin
        .from("patients")
        .update({ profile_id: auth.userId })
        .eq("id", data.id);
      if (linkError) return fail(linkError.message, 500);
      patientId = data.id;
    }
  }

  // Step 3: first time at this hospital under any name — create the record.
  if (!patientId) {
    const { data, error } = await admin
      .from("patients")
      .insert({
        tenant_id: doctor.tenant_id,
        profile_id: auth.userId,
        // Trigger-generated when blank (0016_patients.sql) — never accepted
        // from outside, same as doctors.slug.
        mrn: "",
        full_name: profile?.full_name || profile?.email?.split("@")[0] || "Patient",
        phone: profile?.phone ?? null,
        email: profile?.email ?? null,
        ...(personal ?? {}),
      })
      .select("id")
      .single();
    if (error) return fail(error.message, 500);
    patientId = data.id;
  }

  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .insert({
      tenant_id: doctor.tenant_id,
      patient_id: patientId,
      doctor_id: doctor.id,
      department: department ?? doctor.specialty ?? null,
      scheduled_date,
      scheduled_time,
      status: "scheduled",
      notes: notes ?? null,
    })
    .select("id, scheduled_date, scheduled_time, status")
    .single();

  if (appointmentError) {
    // 23505 = unique_violation, from appointments_doctor_slot_unique (0024) —
    // someone else already holds this doctor's exact date and time.
    if (appointmentError.code === "23505") {
      return fail("That doctor is already booked for this date and time. Please pick another slot.", 409);
    }
    return fail(appointmentError.message, 500);
  }

  return json(
    {
      data: {
        ...appointment,
        doctor: { name: doctor.name, specialty: doctor.specialty },
        hospital: { name: doctor.hospital_name },
      },
    },
    201,
  );
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient") return fail("Only a patient can view their own appointments", 403);

  const admin = createAdminSupabase();

  let patientIds: string[];
  try {
    patientIds = await patientIdsForUser(admin, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your record", 500);
  }

  if (patientIds.length === 0) return json({ data: [] });

  const { data, error } = await admin
    .from("appointments")
    .select("id, scheduled_date, scheduled_time, status, department, notes, doctors(name, specialty), tenants(name)")
    .in("patient_id", patientIds)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  if (error) return fail(error.message, 500);

  return json({
    data: (data ?? []).map((row) => ({
      id: row.id,
      scheduled_date: row.scheduled_date,
      scheduled_time: row.scheduled_time,
      status: row.status,
      department: row.department,
      notes: row.notes,
      doctor: row.doctors ? { name: row.doctors.name, specialty: row.doctors.specialty } : null,
      hospital: row.tenants ? { name: row.tenants.name } : null,
    })),
  });
};

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    id: z.string().uuid("Which appointment?"),
  }),
  z.object({
    action: z.literal("reschedule"),
    id: z.string().uuid("Which appointment?"),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time."),
  }),
]);

// Same shape the old cancel-only body used (no `action`), still accepted so
// nothing already calling this route with `{ id }` alone breaks.
const legacyCancelSchema = z.object({ id: z.string().uuid("Which appointment?") });

/**
 * Cancel or reschedule — a patient does not get generic appointment edit
 * rights, only these two narrow actions.
 */
export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient") return fail("Only a patient can manage their own appointment", 403);

  const body = await request.json().catch(() => null);

  let action: "cancel" | "reschedule";
  let id: string;
  let scheduled_date: string | undefined;
  let scheduled_time: string | undefined;

  const parsed = patchSchema.safeParse(body);
  if (parsed.success) {
    action = parsed.data.action;
    id = parsed.data.id;
    if (parsed.data.action === "reschedule") {
      scheduled_date = parsed.data.scheduled_date;
      scheduled_time = parsed.data.scheduled_time;
    }
  } else {
    const legacy = legacyCancelSchema.safeParse(body);
    if (!legacy.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    action = "cancel";
    id = legacy.data.id;
  }

  const admin = createAdminSupabase();

  let patientIds: string[];
  try {
    patientIds = await patientIdsForUser(admin, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your record", 500);
  }
  if (patientIds.length === 0) return fail("Appointment not found", 404);

  if (action === "cancel") {
    const { data, error } = await admin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .in("patient_id", patientIds) // never lets a patient touch a row that isn't theirs
      .select("id, status")
      .maybeSingle();

    if (error) return fail(error.message, 500);
    if (!data) return fail("Appointment not found", 404);

    return json({ data });
  }

  // Reschedule: only a still-scheduled appointment can move — a cancelled
  // one is done, and completed is history.
  const { data, error } = await admin
    .from("appointments")
    .update({ scheduled_date, scheduled_time })
    .eq("id", id)
    .eq("status", "scheduled")
    .in("patient_id", patientIds)
    .select("id, scheduled_date, scheduled_time, status")
    .maybeSingle();

  if (error) {
    // 23505 = appointments_doctor_slot_unique (0024) — someone else already
    // holds the doctor's slot being rescheduled into.
    if (error.code === "23505") {
      return fail("That doctor is already booked for this date and time. Please pick another slot.", 409);
    }
    return fail(error.message, 500);
  }
  if (!data) return fail("Appointment not found, or it's no longer scheduled", 404);

  return json({ data });
};
