import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The payslip lines of a payroll run (0042).
 *
 * Read-mostly: the lines are written by POST /payroll-runs/:id/process, which
 * computes them from the staff register and the hospital's payroll settings.
 * This resource exists so the page can list a run's payslips and so a single
 * line can be corrected by hand afterwards.
 *
 * `run_id` and the employee snapshot are absent from the update schema —
 * moving a payslip to another run, or rewriting who it was for, is not an
 * edit, it is a new payslip.
 */

const amount = z.coerce.number().min(0);

export const payrollPayslipUpdateSchema = z.object({
  basic: amount.optional(),
  house_rent: amount.optional(),
  medical: amount.optional(),
  transport: amount.optional(),
  gross: amount.optional(),
  pf: amount.optional(),
  tax: amount.optional(),
  loan: amount.optional(),
  total_deductions: amount.optional(),
  // Deliberately allowed to go negative: a large enough loan can put a month
  // underwater, and the table records that rather than refusing it.
  net: z.coerce.number().optional(),
});

/**
 * Creating a payslip directly is not supported — a payslip belongs to a run
 * and is derived from it, so the only way to make one is to process the run.
 * The schema still has to exist for the factory, so it is the update schema
 * with the fields a row cannot be created without.
 */
export const payrollPayslipCreateSchema = payrollPayslipUpdateSchema.extend({
  run_id: z.string().uuid(),
  emp_id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  department: z.string().trim().max(200).optional(),
  designation: z.string().trim().max(200).optional(),
  employee_id: z.string().uuid().optional(),
  period: z.string().trim().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM form"),
});

export type PayrollPayslipCreate = z.infer<typeof payrollPayslipCreateSchema>;
export type PayrollPayslipUpdate = z.infer<typeof payrollPayslipUpdateSchema>;

export const payrollPayslipsResource: ResourceDefinition<
  PayrollPayslipCreate,
  PayrollPayslipUpdate
> = {
  name: "payroll-payslips",
  table: "payroll_payslips",
  tenantScoped: true,
  createSchema: payrollPayslipCreateSchema,
  updateSchema: payrollPayslipUpdateSchema,
  searchFields: ["name", "emp_id", "department"],
  filterFields: ["run_id", "period", "department"],
  defaultSort: { column: "name", ascending: true },
  roles: {
    // Same three desks that own /admin/payroll in 0009_roles_management.sql.
    read: ["hospital_admin", "hr_admin", "finance_admin"],
    write: ["hospital_admin", "hr_admin", "finance_admin"],
  },
};
