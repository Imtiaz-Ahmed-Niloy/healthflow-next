import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The examination list — /api/v1/examinations, `public.examinations` (0102).
 *
 * What a doctor picks from in the prescription's On Examination section, each
 * with the values it is usually recorded with. A global lookup like
 * complaints: no tenant_id, read by any signed-in user, written by the super
 * admin alone (RLS says so; `write: []` says it here too).
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const examinationsCreateSchema = z.object({
  name: z.string().trim().min(1, "Write the examination").max(200),
  details: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  sort_order: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  is_active: z.preprocess(
    v => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
});

export const examinationsUpdateSchema = examinationsCreateSchema.partial();

export const examinationsResource: ResourceDefinition<
  z.infer<typeof examinationsCreateSchema>,
  z.infer<typeof examinationsUpdateSchema>
> = {
  name: "examinations",
  table: "examinations",
  tenantScoped: false,
  createSchema: examinationsCreateSchema,
  updateSchema: examinationsUpdateSchema,
  searchFields: ["name"],
  filterFields: ["is_active"],
  defaultSort: { column: "sort_order", ascending: true },
  roles: { write: [] },
};
