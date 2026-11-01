import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);
const optionalDate = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const bloodDonorCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  phone: z.string().trim().min(1, "Phone is required").max(50),
  email: z.preprocess(blankToUndefined, z.string().email().nullable().optional()),
  age: z.preprocess(blankToUndefined, z.coerce.number().int().min(16).max(80).nullable().optional()),
  gender: z.preprocess(blankToUndefined, z.enum(["male", "female", "other"]).nullable().optional()),
  last_donation_date: optionalDate,
  eligible: z.coerce.boolean().optional().default(true),
  notes: optionalText,
});

export const bloodDonorUpdateSchema = bloodDonorCreateSchema.partial();

export type BloodDonorCreate = z.infer<typeof bloodDonorCreateSchema>;
export type BloodDonorUpdate = z.infer<typeof bloodDonorUpdateSchema>;

export const bloodDonorsResource: ResourceDefinition<BloodDonorCreate, BloodDonorUpdate> = {
  name: "blood-donors",
  table: "blood_donors",
  tenantScoped: true,
  createSchema: bloodDonorCreateSchema,
  updateSchema: bloodDonorUpdateSchema,
  searchFields: ["name", "phone", "email"],
  filterFields: ["blood_group", "eligible"],
  defaultSort: { column: "name", ascending: true },
};

