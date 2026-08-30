import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Lab requests — one test ordered for one patient (0047).
 *
 * The catalogue itself is `lab-tests` (0032); this is what was asked for.
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const LAB_ORDER_STATUSES = [
  "pending", "sample_collected", "processing", "reported",
] as const;

export const labOrderCreateSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(100),
  patient_id: z.string().uuid("Pick a patient"),
  /**
   * Both, on purpose. `lab_test_id` is the link to the catalogue; `test_name`
   * is the snapshot that keeps the order readable if the test is later retired
   * from it. The client sends the name it displayed, so what the order says is
   * what the person ordering actually saw.
   */
  lab_test_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  test_name: z.string().trim().min(1, "Pick a test").max(200),
  doctor_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  status: z.enum(LAB_ORDER_STATUSES).optional(),
  /**
   * A result and the time it was reported move together — the table has a
   * check constraint saying so, because a result with no timestamp is a
   * half-finished order. The page sends both or neither.
   */
  result: z.preprocess(blankToUndefined, z.string().trim().max(5000).nullable().optional()),
  reported_at: z.preprocess(blankToUndefined, z.string().datetime().nullable().optional()),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const labOrderUpdateSchema = labOrderCreateSchema.partial();

export type LabOrderCreate = z.infer<typeof labOrderCreateSchema>;
export type LabOrderUpdate = z.infer<typeof labOrderUpdateSchema>;

export const labOrdersResource: ResourceDefinition<LabOrderCreate, LabOrderUpdate> = {
  name: "lab-orders",
  table: "lab_orders",
  tenantScoped: true,
  createSchema: labOrderCreateSchema,
  updateSchema: labOrderUpdateSchema,
  // Embeds the patient and doctor names, so the list does not need a second
  // round trip to show who an order is for.
  select: "*, patients ( full_name ), doctors ( name )",
  searchFields: ["reference", "test_name"],
  filterFields: ["status", "patient_id", "doctor_id"],
  // A worklist: oldest request first, because that is the one waiting longest.
  defaultSort: { column: "requested_at", ascending: true },
  roles: {
    read: ["hospital_admin", "lab_admin", "doctor"],
    write: ["hospital_admin", "lab_admin"],
  },
};
