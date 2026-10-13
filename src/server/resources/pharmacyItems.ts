import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResourceDefinition } from "./types";

/**
 * The pharmacy's catalogue: what it sells, for how much, and the level at
 * which it should be bought again (0036, widened by 0126).
 *
 * `stock` and `status` are not here. Stock is the sum of the product's
 * batches and status follows from it; both are kept by triggers, and the
 * database ignores a value sent for either. Stock arrives through a purchase
 * order or "Add stock", and leaves through a sale.
 */

/** "" from a form clears the column rather than being skipped. */
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((value) => (value === "" ? null : value));

/** Number fields arrive from forms as strings, and "" means "not given". */
const money = z
  .literal("")
  .transform(() => undefined)
  .or(z.coerce.number().min(0, "Cannot be negative").max(99_999_999))
  .optional();

const wholeNumber = z
  .literal("")
  .transform(() => undefined)
  .or(z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"))
  .optional();

/**
 * How many single units a strip or a box holds, and what one costs (0131).
 * "" clears it: the product then stops being sold that way, or goes back to
 * costing its units added up.
 */
const packSize = z
  .literal("")
  .transform(() => null)
  .or(z.coerce.number().int("Must be a whole number").min(2, "Must be 2 or more").max(100_000))
  .nullable()
  .optional();

const packPrice = z
  .literal("")
  .transform(() => null)
  .or(z.coerce.number().min(0, "Cannot be negative").max(99_999_999))
  .nullable()
  .optional();

/** A checkbox posts "on", a select posts "true"/"false", JSON posts a boolean. */
const flag = z
  .union([z.boolean(), z.enum(["true", "false", "on", "off", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "on" || value === "1")
  .optional();

export const pharmacyItemCreateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(100),
  name: z.string().trim().min(1, "Product name is required").max(200),
  generic_name: optionalText(200),
  description: optionalText(2000),
  category: optionalText(100),
  manufacturer: optionalText(200),
  selling_price: money,
  cost_price: money,
  strip_size: packSize,
  strip_price: packPrice,
  box_size: packSize,
  box_price: packPrice,
  reorder: wholeNumber,
  requires_prescription: flag,
  track_expiry: flag,
  is_active: flag,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const pharmacyItemUpdateSchema = pharmacyItemCreateSchema.partial();

export type PharmacyItemCreate = z.infer<typeof pharmacyItemCreateSchema>;
export type PharmacyItemUpdate = z.infer<typeof pharmacyItemUpdateSchema>;

export const pharmacyItemsResource: ResourceDefinition<PharmacyItemCreate, PharmacyItemUpdate> = {
  name: "pharmacy-items",
  table: "pharmacy_items",
  tenantScoped: true,
  createSchema: pharmacyItemCreateSchema,
  updateSchema: pharmacyItemUpdateSchema,
  searchFields: ["sku", "name", "generic_name", "manufacturer", "category"],
  filterFields: ["status", "category", "is_active"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Finance reads, because stock is money on a shelf. Doctors no longer do:
    // the cost price is on this row now (0126).
    read: ["hospital_admin", "pharmacy_admin", "finance_admin"],
    write: ["hospital_admin", "pharmacy_admin"],
  },
  /**
   * A product that has been stocked, ordered or sold stays. The database would
   * refuse the delete anyway (its batches and sale lines point at it), with a
   * message about a foreign key; this says what to do instead.
   */
  beforeDelete: async ({ id }) => {
    // Untyped for the reason createResourceRoute gives: tables named at runtime.
    const supabase = (await createServerSupabase()) as unknown as SupabaseClient;

    for (const table of ["pharmacy_batches", "pharmacy_sale_items", "pharmacy_purchase_order_items"]) {
      const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("item_id", id);
      if (count) return "This product has stock, orders or sales behind it. Switch it off instead of deleting it.";
    }
  },
};
