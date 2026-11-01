import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const bloodInventoryCreateSchema = z.object({
  bag_number: z.string().trim().min(1, "Bag number is required").max(60),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  component: z.enum(["whole_blood", "rbc", "platelets", "plasma", "cryoprecipitate"]).optional().default("whole_blood"),
  donor_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  collected_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  expiry_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  volume_ml: z.coerce.number().int().min(50).max(1000).default(450),
  status: z.enum(["available", "reserved", "transfused", "discarded", "expired"]).optional().default("available"),
  storage_location: optionalText.default("Refrigerator 1"),
});

export const bloodInventoryUpdateSchema = bloodInventoryCreateSchema.partial();

export type BloodInventoryCreate = z.infer<typeof bloodInventoryCreateSchema>;
export type BloodInventoryUpdate = z.infer<typeof bloodInventoryUpdateSchema>;

export const bloodInventoryResource: ResourceDefinition<BloodInventoryCreate, BloodInventoryUpdate> = {
  name: "blood-inventory",
  table: "blood_inventory",
  tenantScoped: true,
  createSchema: bloodInventoryCreateSchema,
  updateSchema: bloodInventoryUpdateSchema,
  searchFields: ["bag_number", "storage_location"],
  filterFields: ["blood_group", "component", "status"],
  defaultSort: { column: "expiry_date", ascending: true },
};

