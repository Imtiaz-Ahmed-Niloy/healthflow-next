import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * A hospital's pharmacy inventory — what is stocked, how much is left, and
 * the level at which it needs reordering.
 *
 * Dispensing is not here. That belongs to a prescription being filled and
 * needs to reference a patient and a doctor, which this table deliberately
 * does not; it is tracked separately.
 */

// Stored lowercase, like every other module. The page owns the display labels.
const pharmacyItemCategory = z.enum(["analgesic", "antibiotic", "endocrine", "cardio", "vitamins"]);
const pharmacyItemStatus = z.enum(["active", "low_stock", "out_of_stock"]);

/**
 * Treats "" from an HTML form the same as omitted.
 *
 * The empty-string check has to come first: z.coerce.number() parses "" as 0
 * rather than failing, so a `.or(z.literal(""))` placed after the coercion
 * can never match and an emptied field silently saves as 0.
 */
const optionalNumber = z
  .literal("")
  .transform(() => undefined)
  .or(z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"))
  .optional();

export const pharmacyItemCreateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(100),
  name: z.string().trim().min(1, "Item name is required").max(200),
  category: pharmacyItemCategory.optional(),
  stock: optionalNumber,
  reorder: optionalNumber,
  status: pharmacyItemStatus.optional(),
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
  searchFields: ["sku", "name", "category"],
  filterFields: ["status", "category"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // pharmacy_admin owns the inventory; hospital_admin oversees it. Doctors
    // read it to know what is in stock before prescribing.
    read: ["hospital_admin", "pharmacy_admin", "doctor"],
    write: ["hospital_admin", "pharmacy_admin"],
  },
};
