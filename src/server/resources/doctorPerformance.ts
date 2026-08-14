import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Doctor performance — served at /api/v1/doctor-performance, stored in
 * `public.doctor_performance`.
 *
 * One row per doctor, holding the figures on the Performance tab of
 * /admin/doctors. They are entered rather than derived: appointments and
 * billing do not exist yet, so there is nothing to count them from.
 */

/** Form numbers arrive as strings, and "" means the field was cleared. */
const number = (max?: number) => {
  const base = z.coerce.number().min(0);
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    (max === undefined ? base : base.max(max)).optional(),
  );
};

export const doctorPerformanceCreateSchema = z.object({
  doctor_id: z.string().uuid("Pick a doctor"),
  patient_volume: number(),
  consultations: number(),
  revenue: number(),
  // Same 0-5 scale as doctors.rating, mirrored here so a bad value is a clean
  // 422 rather than a 23514 surfaced as "Invalid values".
  feedback: number(5),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const doctorPerformanceUpdateSchema = doctorPerformanceCreateSchema.partial();

export type DoctorPerformanceCreate = z.infer<typeof doctorPerformanceCreateSchema>;
export type DoctorPerformanceUpdate = z.infer<typeof doctorPerformanceUpdateSchema>;

export const doctorPerformanceResource: ResourceDefinition<
  DoctorPerformanceCreate,
  DoctorPerformanceUpdate
> = {
  name: "doctor-performance",
  table: "doctor_performance",
  tenantScoped: true,
  createSchema: doctorPerformanceCreateSchema,
  updateSchema: doctorPerformanceUpdateSchema,

  // The tab lists a doctor's name and specialty beside their figures.
  select: "*, doctors ( id, name, specialty )",

  filterFields: ["doctor_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Matches doctors: a doctor may see their own numbers, RLS scopes them.
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
