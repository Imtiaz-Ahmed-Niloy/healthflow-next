import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * A patient's saved doctors — /api/v1/saved-doctors, `public.saved_doctors`
 * (0092).
 *
 * Saved from the Save button on a doctor's profile, listed on
 * /patient/saved-doctors. The owner is stamped from the session (ownerColumn)
 * and RLS shows a row to that person alone, so this only describes the shape.
 * Saving the same doctor twice is refused by the table (409).
 */

export const savedDoctorCreateSchema = z.object({
  doctor_id: z.string().uuid("Which doctor?"),
});

export const savedDoctorsResource: ResourceDefinition<
  z.infer<typeof savedDoctorCreateSchema>,
  Partial<z.infer<typeof savedDoctorCreateSchema>>
> = {
  name: "saved-doctors",
  table: "saved_doctors",
  // A person's list, not a hospital's — no tenant_id (see 0092).
  tenantScoped: false,
  ownerColumn: "profile_id",
  createSchema: savedDoctorCreateSchema,
  // A doctor is saved or not; the app only ever creates and deletes.
  updateSchema: savedDoctorCreateSchema.partial(),
  defaultSort: { column: "created_at", ascending: false },
  roles: { read: ["patient"], write: ["patient"] },
};
