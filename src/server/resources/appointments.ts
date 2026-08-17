import { z } from "zod";
import type { ResourceDefinition } from "./types";

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
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    // doctor can write: marking their own appointment completed/cancelled is
    // a day-to-day clinical action, same as admissions.
    write: ["hospital_admin", "hr_admin", "doctor"],
  },
};
