import { z } from "zod";
import type { ResourceDefinition } from "./types";
import { createServerSupabase } from "@/lib/supabase/server";
import { outsideAvailabilityReason, parseAvailability } from "@/lib/availability";
import { pastSlotReason } from "@/lib/timezone";
import { blockedReason } from "@/server/scheduleBlocks";

/**
 * Appointment bookings — served at /api/v1/appointments, stored in
 * public.appointments.
 *
 * The staff behind /admin/appointments. One row per scheduled visit, carrying
 * a real patient and an optional doctor — see 0020_appointments.sql for why
 * this is a separate table from admissions/bed_stays.
 */

const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled"] as const;

/**
 * "" means the field was cleared on purpose, so it maps to null. `undefined`
 * would mean "leave this alone" — PATCH drops undefined keys, so without this
 * an appointment could never be unassigned from a doctor once one had been set.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);

const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

export const appointmentCreateSchema = z.object({
  patient_id: z.string().uuid("A patient is required"),

  /**
   * Nullable, not optional-only. A booking can exist before a doctor is
   * assigned, and the select on the form offers a blank option for exactly
   * that, same as doctor_assistants.doctor_id.
   */
  doctor_id: z.preprocess(
    blankToNull,
    z.string().uuid("Pick a doctor from the list").nullable().optional(),
  ),

  department: nullableText(200),
  scheduled_date: z.string().trim().min(1, "Date is required"),
  scheduled_time: z.string().trim().min(1, "Time is required"),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  notes: nullableText(2000),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const appointmentUpdateSchema = appointmentCreateSchema.partial();

export type AppointmentCreate = z.infer<typeof appointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof appointmentUpdateSchema>;

/**
 * A visit has to be inside its doctor's days and hours, and not already past
 * on the platform's clock — the same two rules a patient's own booking is held
 * to (api/v1/patient/appointments). /admin/appointments says them in the form
 * first; this is the check that holds.
 *
 * An update is judged only when it moves the visit: the form sends every
 * field back on each save, and last week's appointment still has to be
 * markable as completed. So the doctor, date and time are compared with what
 * the row already has, and an untouched slot passes.
 */
const slotRefusal: NonNullable<ResourceDefinition["beforeWrite"]> = async ({ id, values }) => {
  const supabase = await createServerSupabase();

  let doctorId = values.doctor_id as string | null | undefined;
  let date = values.scheduled_date as string | undefined;
  let time = (values.scheduled_time as string | undefined)?.slice(0, 5);

  if (id) {
    const { data: existing } = await supabase
      .from("appointments")
      .select("doctor_id, scheduled_date, scheduled_time")
      .eq("id", id)
      .maybeSingle();
    // Not theirs to see: the update finds no row either, and answers 404.
    if (!existing) return;

    // A field the caller did not send keeps the value the row has.
    if (doctorId === undefined) doctorId = existing.doctor_id;
    date ??= existing.scheduled_date;
    time ??= existing.scheduled_time.slice(0, 5);

    const unmoved =
      (doctorId ?? null) === existing.doctor_id &&
      date === existing.scheduled_date &&
      time === existing.scheduled_time.slice(0, 5);
    if (unmoved) return;
  }

  if (!date || !time) return;

  const { data: settings } = await supabase.from("global_settings").select("timezone").limit(1).maybeSingle();
  const past = pastSlotReason(date, time, settings?.timezone || "Asia/Dhaka");
  if (past) return past;

  // No doctor yet: only the clock limits the visit.
  if (!doctorId) return;
  const { data: doctor } = await supabase
    .from("doctors")
    .select("name, availability")
    .eq("id", doctorId)
    .maybeSingle();
  // A doctor the caller cannot read is the foreign key's and RLS's to refuse.
  if (!doctor) return;

  const offHours = outsideAvailabilityReason(parseAvailability(doctor.availability), date, time, doctor.name);
  if (offHours) return offHours;

  // Nor in time the doctor blocked on their own schedule — leave, an
  // operation, a round (0125).
  return (await blockedReason(supabase, doctorId, date, time, doctor.name)) ?? undefined;
};

export const appointmentsResource: ResourceDefinition<
  AppointmentCreate,
  AppointmentUpdate
> = {
  name: "appointments",
  table: "appointments",
  tenantScoped: true,

  // Embeds patient/doctor identity so the table renders without a second
  // round trip, same as admissions.ts.
  select: "*, patients(id, full_name, mrn, phone), doctors(id, name, specialty)",

  createSchema: appointmentCreateSchema,
  updateSchema: appointmentUpdateSchema,

  /**
   * Patient/doctor names are deliberately not here. PostgREST's `or` filter
   * cannot reach into an embedded relation, so listing them would fail
   * rather than search. The page offers patient/doctor dropdowns instead —
   * see Appointments.tsx, same pattern as DoctorAssistants.tsx.
   */
  searchFields: ["department", "notes"],

  filterFields: ["status", "patient_id", "doctor_id"],
  defaultSort: { column: "scheduled_date", ascending: false },
  beforeWrite: slotRefusal,
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    // doctor can write: marking their own appointment completed/cancelled is
    // a day-to-day clinical action, same as admissions.
    write: ["hospital_admin", "hr_admin", "doctor"],
  },
};
