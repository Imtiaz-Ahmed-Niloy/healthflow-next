import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Platform invoices — served at /api/v1/platform-invoices, stored in
 * `public.platform_invoices`.
 *
 * What a hospital owes HealthFlow for a month, at the rate on its package,
 * for the prescriptions its doctors wrote. Raised in bulk by
 * POST /api/v1/super/billing/generate, which calls the generator in 0056 —
 * this route exists to read them back and to settle them.
 *
 * There is deliberately no create schema worth the name. An invoice is not
 * something anyone types: every number on it is counted or copied from the
 * package assignment, and a hand-written one would be a bill nobody can
 * reconcile against the appointments it claims to bill.
 */

const blankToNull = (value: unknown) => (value === "" ? null : value);

/**
 * Only what settling an invoice touches. `prescriptions`, `unit_price`,
 * `discount_pct`, `billing_month` and the package snapshot are all absent on
 * purpose: they are the statement that was issued. An invoice raised wrongly
 * is voided and regenerated, not edited into a different amount.
 *
 * `total` is generated in the database and `paid_at` is stamped by a trigger,
 * so neither can be sent here at all.
 */
export const platformInvoiceUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "void"]).optional(),
  notes: z.preprocess(blankToNull, z.string().trim().max(2000).nullable().optional()),
  due_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
});

export type PlatformInvoiceUpdate = z.infer<typeof platformInvoiceUpdateSchema>;

export const platformInvoicesResource: ResourceDefinition<
  PlatformInvoiceUpdate,
  PlatformInvoiceUpdate
> = {
  name: "platform-invoices",
  table: "platform_invoices",

  /**
   * False, despite the rows carrying a tenant_id.
   *
   * `tenantScoped` is about stamping a writer's own hospital onto what they
   * write, and the only writer here is a super_admin settling somebody else's
   * bill. Which hospital an invoice belongs to is decided by the generator,
   * from the appointments it counted. RLS (0056) is what keeps a hospital
   * admin's reads to their own.
   */
  tenantScoped: false,

  createSchema: platformInvoiceUpdateSchema,
  updateSchema: platformInvoiceUpdateSchema,

  /** The screen bills a hospital by name, not by uuid. */
  select: "*, tenants ( id, name, slug )",

  searchFields: ["package_name", "notes"],
  filterFields: ["status", "tenant_id", "billing_month"],
  defaultSort: { column: "billing_month", ascending: false },

  roles: {
    // No read gate: RLS gives a hospital_admin their own hospital's invoices
    // and nobody else theirs. Empty write means super_admin only — a hospital
    // cannot mark its own bill paid.
    read: ["hospital_admin"],
    write: [],
  },
};
