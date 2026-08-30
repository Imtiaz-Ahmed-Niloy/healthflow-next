import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Purchase requisitions — one request to buy something (0048).
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).nullable().optional());

export const REQUISITION_STAGES = [
  "pending", "approved", "ordered", "delivered", "rejected",
] as const;

export const requisitionCreateSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(100),
  title: z.string().trim().min(1, "Say what is being bought").max(300),
  department: optionalText,
  /**
   * Both, on purpose. `vendor_id` links to the vendor register; `vendor_name`
   * is the snapshot that keeps a delivered order readable if that vendor is
   * later removed.
   */
  vendor_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  vendor_name: optionalText,
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  stage: z.enum(REQUISITION_STAGES).optional(),
  notes: optionalText,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const requisitionUpdateSchema = requisitionCreateSchema.partial();

export type RequisitionCreate = z.infer<typeof requisitionCreateSchema>;
export type RequisitionUpdate = z.infer<typeof requisitionUpdateSchema>;

export const procurementRequisitionsResource: ResourceDefinition<
  RequisitionCreate,
  RequisitionUpdate
> = {
  name: "procurement-requisitions",
  table: "procurement_requisitions",
  tenantScoped: true,
  createSchema: requisitionCreateSchema,
  updateSchema: requisitionUpdateSchema,
  select: "*, vendors ( name )",
  searchFields: ["reference", "title", "department", "vendor_name"],
  filterFields: ["stage", "vendor_id", "department"],
  // A worklist: oldest request first, because that is the one waiting longest
  // for a decision.
  defaultSort: { column: "requested_at", ascending: true },
  roles: {
    read: ["hospital_admin", "finance_admin"],
    write: ["hospital_admin", "finance_admin"],
  },
};
