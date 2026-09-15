import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The investigations list — /api/v1/investigations, `public.investigations` (0094).
 *
 * What a doctor picks from in the prescription's Investigation section. A
 * global lookup like specialties: no tenant_id, read by any signed-in user,
 * written by the super admin alone (RLS says so; `write: []` says it here too).
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const investigationCreateSchema = z.object({
  name: z.string().trim().min(1, "Name the investigation").max(200),
  category: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  sort_order: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  is_active: z.preprocess(
    v => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
});

export const investigationUpdateSchema = investigationCreateSchema.partial();

export const investigationsResource: ResourceDefinition<
  z.infer<typeof investigationCreateSchema>,
  z.infer<typeof investigationUpdateSchema>
> = {
  name: "investigations",
  table: "investigations",
  tenantScoped: false,
  createSchema: investigationCreateSchema,
  updateSchema: investigationUpdateSchema,
  searchFields: ["name", "category"],
  filterFields: ["category", "is_active"],
  defaultSort: { column: "name", ascending: true },
  roles: { write: [] },
};
