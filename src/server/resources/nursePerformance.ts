import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Nurse performance — served at /api/v1/nurse-performance, stored in
 * `public.nurse_performance`. One row per nurse.
 *
 * The figures are entered rather than derived; see 0014_nurses.sql.
 */

/** Number fields arrive from forms as strings. */
const count = z.coerce.number().int().min(0, "Cannot be negative");

export const nursePerformanceCreateSchema = z.object({
  nurse_id: z.string().uuid("Pick a nurse"),
  patients_handled: count.optional(),
  hours_worked: count.optional(),
  attendance_pct: z.coerce
    .number()
    .min(0, "Cannot be negative")
    .max(100, "Cannot be more than 100")
    .optional(),
  incidents: count.optional(),
  feedback: z.coerce
    .number()
    .min(0, "Cannot be negative")
    .max(5, "Cannot be more than 5")
    .optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const nursePerformanceUpdateSchema = nursePerformanceCreateSchema.partial();

export type NursePerformanceCreate = z.infer<typeof nursePerformanceCreateSchema>;
export type NursePerformanceUpdate = z.infer<typeof nursePerformanceUpdateSchema>;

export const nursePerformanceResource: ResourceDefinition<
  NursePerformanceCreate,
  NursePerformanceUpdate
> = {
  name: "nurse-performance",
  table: "nurse_performance",
  tenantScoped: true,
  createSchema: nursePerformanceCreateSchema,
  updateSchema: nursePerformanceUpdateSchema,

  select: "*, nurses ( id, name, ward, shift )",

  filterFields: ["nurse_id"],
  defaultSort: { column: "created_at", ascending: true },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
