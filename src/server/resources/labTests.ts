import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The lab test catalogue — what a hospital offers and what it charges.
 *
 * Not the request queue. That is the other half of /admin/lab, still on
 * localStorage, and it needs a table of its own: it references patients and
 * doctors, which this one deliberately does not.
 *
 * Note there is no `hospital` field. The old seed carried one as free text
 * ("All Hospitals") purely because nothing scoped the rows; tenant_id does
 * that now, and the route stamps it from the JWT.
 */

const labTestStatus = z.enum(["active", "inactive"]);

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const labTestCreateSchema = z.object({
  name: z.string().trim().min(1, "Test name is required").max(200),
  category: optionalText,
  // Required, and coerced because a number input still posts a string. A
  // catalogue entry with no price cannot be quoted to a patient.
  price: z.coerce.number().min(0, "Price cannot be negative"),
  turnaround: optionalText,
  sample: optionalText,
  prep: optionalText,
  description: optionalText,
  status: labTestStatus.optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const labTestUpdateSchema = labTestCreateSchema.partial();

export type LabTestCreate = z.infer<typeof labTestCreateSchema>;
export type LabTestUpdate = z.infer<typeof labTestUpdateSchema>;

export const labTestsResource: ResourceDefinition<LabTestCreate, LabTestUpdate> = {
  name: "lab-tests",
  table: "lab_tests",
  tenantScoped: true,
  createSchema: labTestCreateSchema,
  updateSchema: labTestUpdateSchema,
  searchFields: ["name", "category", "sample"],
  filterFields: ["status", "category"],
  defaultSort: { column: "name", ascending: true },
  roles: {
    // lab_admin owns the catalogue; hospital_admin oversees it. Doctors read
    // it to know what they can order and what it costs. There is no `nurse`
    // role in app_role — nursing staff are records, not logins.
    read: ["hospital_admin", "lab_admin", "doctor"],
    write: ["hospital_admin", "lab_admin"],
  },
};
