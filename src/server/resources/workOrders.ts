import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Work orders — the document issued against an approved requisition (0071).
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(4000).nullable().optional());
const optionalDate = z.preprocess(blankToUndefined, z.string().trim().max(40).nullable().optional());
const money = z.coerce.number().min(0, "Cannot be negative");

export const WORK_ORDER_STATUSES = [
  "draft", "issued", "completed", "cancelled",
] as const;

/**
 * One priced line.
 *
 * `qty` is the packing as written on the form ("2400 Bundle * 50 pcs"), which
 * is why it is text; `unit` is the count that is actually multiplied by the
 * price. The line total is not carried — it is `unit * unit_price` and storing
 * it would be a third number that can disagree with the other two.
 */
export const workOrderItemSchema = z.object({
  qty: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
  description: z.string().trim().min(1, "A line needs a description").max(1000),
  unit: z.coerce.number().min(0, "Cannot be negative"),
  unit_price: money,
});

export const workOrderCreateSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(100),
  issued_on: optionalDate,

  requisition_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),

  requested_by: optionalText,
  customer_code: optionalText,
  department: optionalText,
  job: optionalText,

  bill_to_name: optionalText,
  bill_to_contact: optionalText,
  bill_to_address: optionalText,
  bill_to_phone: optionalText,

  items: z.array(workOrderItemSchema).default([]),

  // Sent by the form rather than derived here: the totals on a signed document
  // are what the two sides agreed, not what a later version of this file would
  // recompute. The check constraints in 0071 keep them non-negative.
  subtotal: money.optional(),
  shipping: money.optional(),
  other: money.optional(),
  total: money.optional(),

  terms: optionalText,
  status: z.enum(WORK_ORDER_STATUSES).optional(),
  completed_on: optionalDate,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const workOrderUpdateSchema = workOrderCreateSchema.partial();

export type WorkOrderItem = z.infer<typeof workOrderItemSchema>;
export type WorkOrderCreate = z.infer<typeof workOrderCreateSchema>;
export type WorkOrderUpdate = z.infer<typeof workOrderUpdateSchema>;

export const workOrdersResource: ResourceDefinition<
  WorkOrderCreate,
  WorkOrderUpdate
> = {
  name: "work-orders",
  table: "work_orders",
  tenantScoped: true,
  createSchema: workOrderCreateSchema,
  updateSchema: workOrderUpdateSchema,
  searchFields: ["reference", "bill_to_name", "department", "job"],
  filterFields: ["status", "requisition_id", "department"],
  // Newest first: an order is read while it is current, unlike the requisition
  // board, which is a queue and reads oldest first.
  defaultSort: { column: "issued_on", ascending: false },
  roles: {
    read: ["hospital_admin", "finance_admin"],
    write: ["hospital_admin", "finance_admin"],
  },
};
