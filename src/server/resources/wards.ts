import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Ward pricing/category config — one row per ward *type* ("ICU",
 * "Maternity"), not a physical bed. See supabase/migrations/0017_wards_beds.sql.
 */

const wardCategory = z.enum(["general", "semi_private", "icu", "maternity", "pediatric"]);

/** Treats "" from a form/JSON body the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const wardCreateSchema = z.object({
  name: z.string().trim().min(1, "Ward name is required").max(200),
  category: wardCategory.optional(),
  daily_rate: z.coerce.number().min(0).optional(),
  nursing_charge: z.coerce.number().min(0).optional(),
  // Wards.tsx already builds a real string[] (facDraft) and posts JSON, not
  // FormData, so this can be a real array validator — no string-coercion
  // workaround needed here, unlike doctors.ts's comma-separated text fields.
  facilities: z.array(z.string().trim().min(1)).optional(),
  notes: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const wardUpdateSchema = wardCreateSchema.partial();

export type WardCreate = z.infer<typeof wardCreateSchema>;
export type WardUpdate = z.infer<typeof wardUpdateSchema>;

export const wardsResource: ResourceDefinition<WardCreate, WardUpdate> = {
  name: "wards",
  table: "wards",
  tenantScoped: true,
  createSchema: wardCreateSchema,
  updateSchema: wardUpdateSchema,
  searchFields: ["name"],
  filterFields: ["category"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
