import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The chief complaints list — /api/v1/complaints, `public.complaints` (0101).
 *
 * What a doctor picks from in the prescription's Chief Complaints section,
 * each with its own detail suggestions. A global lookup like investigations:
 * no tenant_id, read by any signed-in user, written by the super admin alone
 * (RLS says so; `write: []` says it here too).
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const complaintsCreateSchema = z.object({
  name: z.string().trim().min(1, "Write the complaint").max(200),
  details: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  sort_order: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100000).optional()),
  is_active: z.preprocess(
    v => (v === "true" ? true : v === "false" ? false : v),
    z.boolean().optional(),
  ),
});

export const complaintsUpdateSchema = complaintsCreateSchema.partial();

export const complaintsResource: ResourceDefinition<
  z.infer<typeof complaintsCreateSchema>,
  z.infer<typeof complaintsUpdateSchema>
> = {
  name: "complaints",
  table: "complaints",
  tenantScoped: false,
  createSchema: complaintsCreateSchema,
  updateSchema: complaintsUpdateSchema,
  searchFields: ["name"],
  filterFields: ["is_active"],
  defaultSort: { column: "sort_order", ascending: true },
  roles: { write: [] },
};
