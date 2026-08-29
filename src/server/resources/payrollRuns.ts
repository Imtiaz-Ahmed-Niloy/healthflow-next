import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Payroll runs — served at /api/v1/payroll-runs, stored in
 * `public.payroll_runs`.
 *
 * The monthly salary runs listed on /admin/payroll. Payslip lines are still
 * computed client-side from the Onboarding module, so this resource only
 * describes the run: which month, which department, and where it is in the
 * draft -> approved -> paid flow. Copy of doctors.ts — see docs/module-guide.md.
 */

export const PAYROLL_RUN_STATUSES = ["draft", "approved", "paid"] as const;

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/**
 * Number fields arrive from forms as strings, and a blank input posts "".
 *
 * The blank has to be caught *before* coercion. z.coerce.number() reads "" as
 * 0, so the `.or(z.literal(""))` spelling optionalText uses never fires here —
 * it would quietly write a zero into a field the user left empty. Narrowing to
 * string | number first also stops null, true and [] coercing to a number over
 * the JSON API; anything else becomes NaN, which z.number() rejects.
 */
const blankToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return typeof value === "string" || typeof value === "number" ? value : NaN;
};

const optionalNumber = z.preprocess(blankToUndefined, z.coerce.number().optional());

export const payrollRunCreateSchema = z.object({
  // 'YYYY-MM'. The DB has the same check; mirroring it here turns a bad value
  // into a 422 with a message instead of a constraint violation surfacing as a
  // bare 400.
  period: z.string().trim().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM form"),
  department: optionalText,
  reference: optionalText,
  // Written by the "process" step, not typed by a human, but accepted here so
  // the same PATCH that the page already sends validates cleanly.
  headcount: optionalNumber.refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0),
    "Headcount must be a whole number of 0 or more",
  ),
  gross_total: optionalNumber.refine(
    (value) => value === undefined || value >= 0,
    "Gross total cannot be negative",
  ),
  net_total: optionalNumber.refine(
    (value) => value === undefined || value >= 0,
    "Net total cannot be negative",
  ),
  status: z.enum(PAYROLL_RUN_STATUSES).optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
  // Accepting it here would let a client write into another hospital.
});

export const payrollRunUpdateSchema = payrollRunCreateSchema.partial();

export type PayrollRunCreate = z.infer<typeof payrollRunCreateSchema>;
export type PayrollRunUpdate = z.infer<typeof payrollRunUpdateSchema>;

export const payrollRunsResource: ResourceDefinition<PayrollRunCreate, PayrollRunUpdate> = {
  name: "payroll-runs",
  table: "payroll_runs",
  tenantScoped: true,
  createSchema: payrollRunCreateSchema,
  updateSchema: payrollRunUpdateSchema,
  searchFields: ["period", "reference", "department"],
  filterFields: ["status", "department"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // /admin/payroll is on the page list for all three of these roles in
    // 0009_roles_management.sql — hospital_admin, plus HR and Finance who both
    // run payroll for their own desks.
    read: ["hospital_admin", "hr_admin", "finance_admin"],
    write: ["hospital_admin", "hr_admin", "finance_admin"],
  },
};
