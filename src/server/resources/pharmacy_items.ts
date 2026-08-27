import { z } from "zod";
import type { ResourceDefinition } from "./types";

const pharmacyItemCategory = z.enum(["Analgesic", "Antibiotic", "Endocrine", "Cardio", "Vitamins"]);
const pharmacyItemStatus = z.enum(["Active", "Low Stock", "Out of Stock"]);

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Number fields arrive from forms as strings. */
const optionalNumber = z.coerce.number().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const pharmacyItemCreateSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(100),
  name: z.string().trim().min(1, "Item name is required").max(200),
  category: pharmacyItemCategory.optional(),
  stock: optionalNumber.refine(
    (value) => value === undefined || value >= 0,
    "Stock must be a non-negative integer",
  ),
  reorder: optionalNumber.refine(
    (value) => value === undefined || value >= 0,
    "Reorder threshold must be a non-negative integer",
  ),
  status: pharmacyItemStatus.optional(),
});

export const pharmacyItemUpdateSchema = pharmacyItemCreateSchema.partial();

export type PharmacyItemCreate = z.infer<typeof pharmacyItemCreateSchema>;
export type PharmacyItemUpdate = z.infer<typeof pharmacyItemUpdateSchema>;

export const pharmacyItemsResource: ResourceDefinition<PharmacyItemCreate, PharmacyItemUpdate> = {
  name: "pharmacy_items",
  table: "pharmacy_items",
  tenantScoped: true,
  createSchema: pharmacyItemCreateSchema,
  updateSchema: pharmacyItemUpdateSchema,
  searchFields: ["sku", "name", "category"],
  filterFields: ["status", "category"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "pharmacy_admin", "doctor"],
    write: ["hospital_admin", "pharmacy_admin"],
  },
};
