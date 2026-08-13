import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * One row per hospital stay (episode) — deliberately carries no bed/cabin
 * location. See supabase/migrations/0010_admissions_bed_stays.sql for why:
 * that lives in bed_stays instead, so a transfer has somewhere to record
 * where the patient came from.
 *
 * Assigning/changing/releasing a bed or cabin does NOT happen through this
 * resource's PATCH — that goes through POST /api/v1/bed-transfers, which
 * calls the atomic transfer_admission() function. This resource is for the
 * admission's own fields only (patient, doctor, status, diagnosis, notes).
 */

const admissionStatus = z.enum(["admitted", "under_observation", "in_surgery", "discharged"]);
const admissionPriority = z.enum(["routine", "urgent", "critical"]);

/** Treats "" from a form/JSON body the same as omitted. */
const optionalText = z.string().trim().max(4000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

const optionalTimestamp = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const admissionCreateSchema = z.object({
  patient_id: z.string().uuid("A patient is required"),
  doctor_id: z.string().uuid().optional(),
  admitted_at: optionalTimestamp,
  discharged_at: optionalTimestamp,
  status: admissionStatus.optional(),
  priority: admissionPriority.optional(),
  diagnosis: optionalText,
  notes: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const admissionUpdateSchema = admissionCreateSchema.partial();

export type AdmissionCreate = z.infer<typeof admissionCreateSchema>;
export type AdmissionUpdate = z.infer<typeof admissionUpdateSchema>;

export const admissionsResource: ResourceDefinition<AdmissionCreate, AdmissionUpdate> = {
  name: "admissions",
  table: "admissions",
  tenantScoped: true,
  // Embeds patient/doctor identity and the full bed_stays history so the
  // admissions table/detail view can render without extra round trips.
  // Note: PostgREST embeds return ALL related bed_stays rows per admission —
  // there's no way to push an "ended_at is null" filter into the embed
  // through this plain select string, so the client picks the open one.
  select:
    "*, patients(id, full_name, mrn, gender, date_of_birth, phone), " +
    "doctors(id, name, specialty), " +
    "bed_stays(id, bed_id, cabin_id, started_at, ended_at, beds(number), cabins(number))",
  createSchema: admissionCreateSchema,
  updateSchema: admissionUpdateSchema,
  // Patient-name search can't reach through the embed via a plain ilike — it
  // piggybacks on useResourceCrud's existing client-side filtering instead of
  // inventing new server search plumbing. Direct columns only here.
  searchFields: ["diagnosis", "notes"],
  filterFields: ["status", "priority", "patient_id", "doctor_id"],
  defaultSort: { column: "admitted_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    // doctor can write: clinical fields (status/diagnosis/notes) are theirs
    // to update day-to-day, same as permissions.ts's doctor.admissions entry.
    write: ["hospital_admin", "hr_admin", "doctor"],
  },
};
