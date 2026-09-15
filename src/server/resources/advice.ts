import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The advice list — /api/v1/advice, `public.advice` (0095).
 *
 * What a doctor picks from in the prescription's General Advice section. A
 * global lookup like investigations: no tenant_id, read by any signed-in
 * user, written by the super admin alone (RLS says so; `write: []` says it
 * here too).
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const adviceCreateSchema = z.object({
  text: z.string().trim().min(1, "Write the advice").max(500),
  category: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  sort_order: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  is_active: z.preprocess(
    v => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
});

export const adviceUpdateSchema = adviceCreateSchema.partial();

export const adviceResource: ResourceDefinition<
  z.infer<typeof adviceCreateSchema>,
  z.infer<typeof adviceUpdateSchema>
> = {
  name: "advice",
  table: "advice",
  tenantScoped: false,
  createSchema: adviceCreateSchema,
  updateSchema: adviceUpdateSchema,
  searchFields: ["text", "category"],
  filterFields: ["category", "is_active"],
  // The library's own order: care areas in turn, lines within each.
  defaultSort: { column: "sort_order", ascending: true },
  roles: { write: [] },
};
