import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Physical bed inventory, one row per bed, child of a ward config.
 * See supabase/migrations/0017_wards_beds.sql.
 */

const bedType = z.enum(["general", "icu", "cabin"]);
const bedStatus = z.enum(["available", "occupied", "cleaning"]);

/** Treats "" from a form/JSON body the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const bedCreateSchema = z.object({
  ward_id: z.string().uuid("A ward is required"),
  number: z.string().trim().min(1, "Bed number is required").max(50),
  type: bedType.optional(),
  status: bedStatus.optional(),
  // Transitional free-text occupant name — see the migration's comment on
  // beds.patient. Replaced once admissions/bed_stays lands.
  patient: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const bedUpdateSchema = bedCreateSchema.partial();

export type BedCreate = z.infer<typeof bedCreateSchema>;
export type BedUpdate = z.infer<typeof bedUpdateSchema>;

export const bedsResource: ResourceDefinition<BedCreate, BedUpdate> = {
  name: "beds",
  table: "beds",
  tenantScoped: true,
  // Embeds the parent ward so the floor-map UI can render ward name/category/
  // rate without a second round trip per bed.
  select: "*, wards(id, name, category, daily_rate)",
  createSchema: bedCreateSchema,
  updateSchema: bedUpdateSchema,
  searchFields: ["number"],
  filterFields: ["status", "type", "ward_id"],
  defaultSort: { column: "number", ascending: true },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
