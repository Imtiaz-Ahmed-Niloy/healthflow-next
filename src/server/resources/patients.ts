import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Patient registry — the foundation Ward/Bed/Cabin/Admission are built on.
 * See supabase/migrations/0016_patients.sql for where each column came from
 * and what was deliberately left out.
 */

/** Treats "" from a form/JSON body the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

const genderEnum = z.enum(["male", "female", "other"]);

const bloodGroupEnum = z.enum([
  "o_positive", "o_negative",
  "a_positive", "a_negative",
  "b_positive", "b_negative",
  "ab_positive", "ab_negative",
]);

export const patientCreateSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  gender: genderEnum.optional(),
  date_of_birth: z.string().trim().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  phone: optionalText,
  email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  address: optionalText,
  blood_group: bloodGroupEnum.optional(),
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  profile_id: z.string().uuid().optional(),
  // mrn and tenant_id are deliberately absent: mrn is trigger-generated
  // (see 0016_patients.sql), tenant_id is stamped by the route from the JWT.
});

export const patientUpdateSchema = patientCreateSchema.partial();

export type PatientCreate = z.infer<typeof patientCreateSchema>;
export type PatientUpdate = z.infer<typeof patientUpdateSchema>;

export const patientsResource: ResourceDefinition<PatientCreate, PatientUpdate> = {
  name: "patients",
  table: "patients",
  tenantScoped: true,
  createSchema: patientCreateSchema,
  updateSchema: patientUpdateSchema,
  searchFields: ["full_name", "mrn", "phone", "email"],
  filterFields: ["gender"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // doctor gets read so the admissions/ward views can resolve a patient's
    // name without a clean 403 — RLS still governs which rows come back.
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
