import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Packages — served at /api/v1/packages, stored in `public.packages`.
 *
 * The plan catalogue: what a hospital can be put on, and the list price.
 * `hospital_packages` records which hospital is on which plan and at what
 * negotiated price — see hospitalPackages.ts.
 */

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const packageCreateSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(120),

  /**
   * Stable identifier used by offers, the pricing page and the seed in
   * 0010. Editable, but renaming one orphans anything pointing at the old
   * value, so the UI should treat it as write-once.
   */
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may contain lowercase letters, numbers and hyphens only"),

  description: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),

  price_monthly: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),

  // null is meaningful: Enterprise has no seat cap.
  max_users: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().int().min(0).nullable().optional(),
  ),

  features: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export const packageUpdateSchema = packageCreateSchema.partial();

export type PackageCreate = z.infer<typeof packageCreateSchema>;
export type PackageUpdate = z.infer<typeof packageUpdateSchema>;

export const packagesResource: ResourceDefinition<PackageCreate, PackageUpdate> = {
  name: "packages",
  table: "packages",
  tenantScoped: false,
  createSchema: packageCreateSchema,
  updateSchema: packageUpdateSchema,
  searchFields: ["name", "slug", "description"],
  filterFields: ["is_active", "slug"],
  defaultSort: { column: "price_monthly", ascending: true },
  roles: {
    // RLS on packages is `using (true)` for authenticated — a hospital admin
    // has to see the plan they are on. Write is super_admin only.
    write: [],
  },
};
