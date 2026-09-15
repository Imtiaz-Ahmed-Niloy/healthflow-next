import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The specialties list — /api/v1/specialties, `public.specialties` (0093).
 *
 * What a doctor's Specialization is picked from, and what the site filters
 * by. A global lookup like packages: no tenant_id, read by everyone, written
 * by the super admin alone (RLS says so; `write: []` says it here too).
 * Renaming one renames it on the doctors who have it (a trigger in 0093).
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const specialtyCreateSchema = z.object({
  name: z.string().trim().min(1, "Name the specialty").max(100),
  sort_order: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  is_active: z.preprocess(
    v => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
});

export const specialtyUpdateSchema = specialtyCreateSchema.partial();

export const specialtiesResource: ResourceDefinition<
  z.infer<typeof specialtyCreateSchema>,
  z.infer<typeof specialtyUpdateSchema>
> = {
  name: "specialties",
  table: "specialties",
  tenantScoped: false,
  createSchema: specialtyCreateSchema,
  updateSchema: specialtyUpdateSchema,
  searchFields: ["name"],
  filterFields: ["is_active"],
  // The list's own order — what the pickers and filters show.
  defaultSort: { column: "sort_order", ascending: true },
  roles: { write: [] },
};
