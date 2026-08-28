import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Doctor shifts — served at /api/v1/doctor-shifts, stored in
 * `public.doctor_shifts`.
 *
 * The weekly duty roster on the Scheduling tab of /admin/doctors. Many rows
 * per doctor, one per shift.
 */

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const SHIFT_TYPES = ["Regular", "On-Call", "Emergency", "Surgery", "Off"] as const;

/**
 * <input type="time"> submits "HH:MM", Postgres `time` returns "HH:MM:SS".
 * Accepting both means a value read back from the API can be posted again
 * unchanged, which is what an edit does.
 */
const time = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use a 24-hour time like 09:00");

export const doctorShiftCreateSchema = z
  .object({
    doctor_id: z.string().uuid("Pick a doctor"),
    day_of_week: z.enum(DAYS),
    start_time: time,
    end_time: time,
    shift_type: z.enum(SHIFT_TYPES).optional(),
    ward: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.string().trim().max(200).optional(),
    ),
    // tenant_id is deliberately absent: the route stamps it from the JWT.
  })
  /**
   * Mirrors the doctor_shifts_duration_check constraint. Only equality is
   * rejected — end before start is a shift crossing midnight, which is
   * ordinary for a night rota.
   */
  .refine((shift) => shift.start_time.slice(0, 5) !== shift.end_time.slice(0, 5), {
    message: "Start and end time cannot be the same",
    path: ["end_time"],
  });

export const doctorShiftUpdateSchema = doctorShiftCreateSchema.innerType().partial();

export type DoctorShiftCreate = z.infer<typeof doctorShiftCreateSchema>;
export type DoctorShiftUpdate = z.infer<typeof doctorShiftUpdateSchema>;

export const doctorShiftsResource: ResourceDefinition<DoctorShiftCreate, DoctorShiftUpdate> = {
  name: "doctor-shifts",
  table: "doctor_shifts",
  tenantScoped: true,
  createSchema: doctorShiftCreateSchema,
  updateSchema: doctorShiftUpdateSchema,

  // The roster groups by doctor, so each shift carries its doctor's name.
  select: "*, doctors ( id, name, specialty )",

  filterFields: ["doctor_id", "day_of_week", "shift_type"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
