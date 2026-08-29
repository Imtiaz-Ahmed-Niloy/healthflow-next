import { z } from "zod";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabase/server";
import type { ResourceDefinition } from "./types";

/**
 * The reference module. A new module is a file this size.
 *
 * Note what is NOT here: no queries, no auth checks, no tenant filtering, no
 * pagination. createResourceRoute supplies all of it, and RLS enforces the
 * isolation. This file only describes the shape.
 */

const doctorStatus = z.enum(["active", "on_leave", "suspended"]);
const doctorGender = z.enum(["male", "female", "other"]);

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Number fields arrive from forms as strings. */
const optionalNumber = z.coerce.number().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  specialty: optionalText,
  education: optionalText,
  bio: optionalText,
  languages: optionalText,
  expertise: optionalText,
  availability: optionalText,
  email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  phone: optionalText,
  gender: doctorGender.optional(),
  photo_url: optionalText,
  experience_years: optionalNumber,
  rating: optionalNumber,
  consultation_fee: optionalNumber,
  patients_treated: optionalNumber,
  consultation_duration_minutes: optionalNumber,
  status: doctorStatus.optional(),
  profile_id: z.string().uuid().optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
  // Accepting it here would let a client write into another hospital.
});

export const doctorUpdateSchema = doctorCreateSchema.partial();

export type DoctorCreate = z.infer<typeof doctorCreateSchema>;
export type DoctorUpdate = z.infer<typeof doctorUpdateSchema>;

export const doctorsResource: ResourceDefinition<DoctorCreate, DoctorUpdate> = {
  name: "doctors",
  table: "doctors",
  tenantScoped: true,
  createSchema: doctorCreateSchema,
  updateSchema: doctorUpdateSchema,
  searchFields: ["name", "specialty", "email"],
  filterFields: ["status", "specialty", "gender"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor", "patient"],
    write: ["hospital_admin", "hr_admin"],
  },

  /**
   * Removing a doctor has to take their login with it (HF-75).
   *
   * The `doctors` row and `doctor_login_secrets` already went on delete, but
   * the auth user and its profile did not — and RLS reads the tenant off the
   * JWT, so the account kept reading the hospital's patients, appointments and
   * wards long after the doctor was gone.
   *
   * The account itself is left alive on purpose: a doctor may work at more
   * than one hospital, so this severs the employment, not the person. See
   * 0038_revoke_staff_access.sql.
   */
  beforeDelete: async ({ id }) => {
    // The caller's own client, so a hospital_admin from another tenant sees
    // nothing here and the delete goes on to 404 exactly as it did before.
    const supabase = await createServerSupabase();
    const { data: doctor, error } = await supabase
      .from("doctors")
      .select("profile_id")
      .eq("id", id)
      .maybeSingle();

    // Let the delete run and produce the ordinary "Not found". Refusing here
    // would turn every delete of an already-gone row into a confusing 409.
    if (error || !doctor?.profile_id) return;

    const { error: revokeError } = await createAdminSupabase().rpc("revoke_staff_access", {
      p_profile_id: doctor.profile_id,
    });

    // Refuse the delete rather than complete it. A doctor still on the list is
    // a visible problem someone can retry; a deleted doctor holding a working
    // login is the exact silent hole this ticket is about.
    if (revokeError) {
      return `The doctor was not deleted: their login could not be revoked (${revokeError.message}). Try again.`;
    }
  },
};
