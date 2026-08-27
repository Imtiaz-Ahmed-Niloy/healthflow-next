import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The equipment register — what a hospital owns, where it is, and whether it
 * is in service.
 *
 * Not a maintenance log. A service history carries dates, costs and engineers
 * this table has none of, and it will reference these rows when it lands.
 *
 * Note `assignee` is plain text rather than a profile reference. Equipment is
 * signed out to a department or a shift as often as to a named person — the
 * seed this replaces literally held "ICU Team" — and an FK would force every
 * team to be invented as a fake user.
 */

const assetStatus = z.enum(["active", "maintenance", "retired"]);

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/**
 * An empty date input posts "", which Postgres rejects for a `date` column.
 * Same shape as optionalText, kept separate so the max(2000) does not read as
 * if a date could be 2000 characters long.
 */
const optionalDate = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const assetCreateSchema = z.object({
  tag: z.string().trim().min(1, "Asset tag is required").max(60),
  name: z.string().trim().min(1, "Asset name is required").max(200),
  category: optionalText,
  location: optionalText,
  assignee: optionalText,
  purchased_at: optionalDate,
  status: assetStatus.optional(),
  notes: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
  // Accepting it here would let a client write into another hospital.
});

export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetCreate = z.infer<typeof assetCreateSchema>;
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;

export const assetsResource: ResourceDefinition<AssetCreate, AssetUpdate> = {
  name: "assets",
  table: "assets",
  tenantScoped: true,
  createSchema: assetCreateSchema,
  updateSchema: assetUpdateSchema,
  searchFields: ["tag", "name", "location"],
  filterFields: ["status", "category"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // hospital_admin owns the register. finance_admin reads and writes it for
    // the same reason it owns vendors: equipment is capital spend, and the row
    // is usually created by whoever raised the purchase order.
    read: ["hospital_admin", "finance_admin"],
    write: ["hospital_admin", "finance_admin"],
  },
};
