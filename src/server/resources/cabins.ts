import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Private cabins — a standalone product (own floor/capacity/amenities/rate),
 * not a child of any ward. See supabase/migrations/0018_cabins.sql.
 */

const cabinCategory = z.enum(["standard", "deluxe", "premium", "suite"]);
const cabinStatus = z.enum(["available", "occupied", "cleaning", "maintenance", "reserved"]);

/** Treats "" from a form/JSON body the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const cabinCreateSchema = z.object({
  number: z.string().trim().min(1, "Cabin number is required").max(50),
  category: cabinCategory.optional(),
  floor: z.string().trim().min(1, "Floor is required").max(100),
  capacity: z.coerce.number().int().positive().optional(),
  daily_rate: z.coerce.number().min(0).optional(),
  // Wards.tsx already builds a real string[] (amenityDraft) and posts JSON,
  // not FormData, so this can be a real array validator.
  amenities: z.array(z.string().trim().min(1)).optional(),
  status: cabinStatus.optional(),
  // Transitional free-text fields — see the migration's comment on
  // cabins.patient/attendant/admitted_on. Replaced once admissions/bed_stays
  // lands.
  patient: optionalText,
  attendant: optionalText,
  admitted_on: z.string().trim().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const cabinUpdateSchema = cabinCreateSchema.partial();

export type CabinCreate = z.infer<typeof cabinCreateSchema>;
export type CabinUpdate = z.infer<typeof cabinUpdateSchema>;

export const cabinsResource: ResourceDefinition<CabinCreate, CabinUpdate> = {
  name: "cabins",
  table: "cabins",
  tenantScoped: true,
  createSchema: cabinCreateSchema,
  updateSchema: cabinUpdateSchema,
  searchFields: ["number"],
  filterFields: ["status", "category", "floor"],
  defaultSort: { column: "number", ascending: true },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
