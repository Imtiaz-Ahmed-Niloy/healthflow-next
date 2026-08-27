import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Nurse shifts — served at /api/v1/nurse-shifts, stored in
 * `public.nurse_shifts`.
 *
 * The weekly roster grid on the Shift Management tab. Deliberately not shaped
 * like doctor_shifts: a doctor's roster records start and end times, the nurse
 * grid records a named block per day. See 0014_nurses.sql.
 */

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const NURSE_SHIFT_TYPES = ["Morning", "Evening", "Night", "Off"] as const;

const blankToNull = (value: unknown) => (value === "" ? null : value);

export const nurseShiftCreateSchema = z.object({
  nurse_id: z.string().uuid("Pick a nurse"),
  day_of_week: z.enum(DAYS),
  shift_type: z.enum(NURSE_SHIFT_TYPES).optional(),
  ward: z.preprocess(blankToNull, z.string().trim().max(120).nullable().optional()),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const nurseShiftUpdateSchema = nurseShiftCreateSchema.partial();

export type NurseShiftCreate = z.infer<typeof nurseShiftCreateSchema>;
export type NurseShiftUpdate = z.infer<typeof nurseShiftUpdateSchema>;

export const nurseShiftsResource: ResourceDefinition<NurseShiftCreate, NurseShiftUpdate> = {
  name: "nurse-shifts",
  table: "nurse_shifts",
  tenantScoped: true,
  createSchema: nurseShiftCreateSchema,
  updateSchema: nurseShiftUpdateSchema,

  // The roster groups by nurse, so each shift carries its nurse.
  select: "*, nurses ( id, name, ward )",

  filterFields: ["nurse_id", "day_of_week", "shift_type"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
