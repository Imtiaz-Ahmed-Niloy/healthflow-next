import { z } from "zod";
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
};
