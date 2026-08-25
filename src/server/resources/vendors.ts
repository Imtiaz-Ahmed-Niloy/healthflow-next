import { z } from "zod";
import type { ResourceDefinition } from "./types";

const vendorStatus = z.enum(["active", "on_hold", "suspended"]);

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Number fields arrive from forms as strings. */
const optionalNumber = z.coerce.number().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const vendorCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: optionalText,
  contact_person: optionalText,
  phone: optionalText,
  email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  // Mirrors the 1-5 check in the migration so a bad rating is a 400 with a
  // message rather than a constraint violation surfacing as a 500.
  rating: optionalNumber.refine(
    (value) => value === undefined || (value >= 1 && value <= 5),
    "Rating must be between 1 and 5",
  ),
  status: vendorStatus.optional(),
  notes: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
  // Accepting it here would let a client write into another hospital.
});

export const vendorUpdateSchema = vendorCreateSchema.partial();

export type VendorCreate = z.infer<typeof vendorCreateSchema>;
export type VendorUpdate = z.infer<typeof vendorUpdateSchema>;

export const vendorsResource: ResourceDefinition<VendorCreate, VendorUpdate> = {
  name: "vendors",
  table: "vendors",
  tenantScoped: true,
  createSchema: vendorCreateSchema,
  updateSchema: vendorUpdateSchema,
  searchFields: ["name", "category", "contact_person"],
  filterFields: ["status", "category"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Procurement touches more than one desk: finance approves the spend and
    // pharmacy orders against these suppliers directly, so both read. Editing
    // the supplier list itself stays with the admins who own the contracts.
    read: ["hospital_admin", "finance_admin", "pharmacy_admin"],
    write: ["hospital_admin", "finance_admin"],
  },
};
