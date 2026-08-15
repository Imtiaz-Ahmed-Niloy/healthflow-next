import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Hospital packages — served at /api/v1/hospital-packages, stored in
 * `public.hospital_packages`.
 *
 * Which plan a hospital is on and the commercial terms around it: negotiated
 * price, discount, billing cycle, renewal date. One row per hospital, enforced
 * by a unique constraint on tenant_id, so assigning a second package to the
 * same hospital comes back as a 409 rather than silently doubling the bill.
 *
 * A trigger keeps `tenants.package_id` in step with `package_id` here, so the
 * dashboard and every "which plan?" query stay correct without this module
 * knowing about them.
 */

const blankToNull = (value: unknown) => (value === "" ? null : value);
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const hospitalPackageCreateSchema = z.object({
  /**
   * Present, unlike every other module, because `tenantScoped: true` makes the
   * factory demand it from a super_admin — which is exactly right here. This
   * screen assigns a package to a hospital the admin picked, so the tenant is
   * chosen rather than inherited from the caller's own JWT.
   */
  tenant_id: z.string().uuid("Select a hospital"),

  package_id: z.string().uuid("Select a plan"),

  /**
   * Seeded from packages.price_monthly by the UI, then editable — a negotiated
   * price has to survive a change to the list price.
   */
  base_price: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),

  discount_pct: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0, "Discount cannot be negative").max(100, "Discount cannot exceed 100%").optional(),
  ),

  // null clears the offer while keeping the discount that came from it.
  offer_id: z.preprocess(blankToNull, z.string().uuid().nullable().optional()),

  billing_cycle: z.enum(["monthly", "yearly"]).optional(),
  status: z.enum(["active", "trial", "suspended", "expired"]).optional(),

  start_date: z.preprocess(blankToUndefined, z.string().trim().optional()),
  renew_date: z.preprocess(blankToNull, z.string().trim().nullable().optional()),

  notes: z.preprocess(blankToNull, z.string().trim().max(2000).nullable().optional()),
});

export const hospitalPackageUpdateSchema = hospitalPackageCreateSchema.partial();

export type HospitalPackageCreate = z.infer<typeof hospitalPackageCreateSchema>;
export type HospitalPackageUpdate = z.infer<typeof hospitalPackageUpdateSchema>;

export const hospitalPackagesResource: ResourceDefinition<
  HospitalPackageCreate,
  HospitalPackageUpdate
> = {
  name: "hospital-packages",
  table: "hospital_packages",

  /**
   * True, even though only a super_admin can write here.
   *
   * It buys the "tenant_id is required for super_admin" guard, which turns a
   * forgotten hospital into a clean 422 instead of a not-null violation, and
   * it stops a tenant_id in the body from moving a row between hospitals on a
   * PATCH by anyone other than a super_admin.
   */
  tenantScoped: true,

  createSchema: hospitalPackageCreateSchema,
  updateSchema: hospitalPackageUpdateSchema,

  /**
   * The table shows a hospital name, a plan name and an offer code, none of
   * which live on this table. Embedding them costs one join and saves the
   * client three lookups per row.
   */
  select:
    "*, tenants ( id, name, slug, status ), packages ( id, name, slug, price_monthly ), offers ( id, code, label, discount_pct )",

  /**
   * No searchFields: the only thing worth searching is the hospital name, and
   * it lives on the embedded `tenants` row. PostgREST's `or` filter cannot
   * reach into an embed, so search stays client-side in the view — which is
   * where filtering already happens for every other admin table.
   */
  filterFields: ["status", "package_id", "billing_cycle", "tenant_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // A hospital_admin may read their own row; RLS is what limits them to it.
    // Empty write means super_admin only — nobody sets their own discount.
    read: ["hospital_admin"],
    write: [],
  },
};
