import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Invoices in both directions: money the hospital is owed (receivable) and
 * money it owes (payable). See 0043_finance_invoices.sql.
 */

/** Treats "" from an HTML form the same as omitted. */
const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const financeInvoiceCreateSchema = z.object({
  reference: z.string().trim().min(1, "Reference is required").max(100),
  party: z.string().trim().min(1, "Party is required").max(200),
  kind: z.enum(["receivable", "payable"]),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be a date"),
  /**
   * When it was settled. Explicitly nullable so "Mark unpaid" can clear it —
   * there is no status column to flip back, this IS the status.
   */
  paid_at: z.preprocess(blankToUndefined, z.string().datetime().nullable().optional()),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const financeInvoiceUpdateSchema = financeInvoiceCreateSchema.partial();

export type FinanceInvoiceCreate = z.infer<typeof financeInvoiceCreateSchema>;
export type FinanceInvoiceUpdate = z.infer<typeof financeInvoiceUpdateSchema>;

export const financeInvoicesResource: ResourceDefinition<
  FinanceInvoiceCreate,
  FinanceInvoiceUpdate
> = {
  name: "finance-invoices",
  table: "finance_invoices",
  tenantScoped: true,
  createSchema: financeInvoiceCreateSchema,
  updateSchema: financeInvoiceUpdateSchema,
  searchFields: ["reference", "party"],
  filterFields: ["kind"],
  // Soonest due first: the page is a worklist, and what is nearly late matters
  // more than what was entered last.
  defaultSort: { column: "due_date", ascending: true },
  roles: {
    // /admin/finance belongs to the finance desk, with hospital_admin above it.
    read: ["hospital_admin", "finance_admin"],
    write: ["hospital_admin", "finance_admin"],
  },
};
