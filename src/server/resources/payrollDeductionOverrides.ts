import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * A standing deduction adjustment for one employee (0042).
 *
 * Null means "use the computed figure". Zero is a real override meaning
 * "deduct nothing", so these are nullable rather than defaulted, and the
 * schema accepts null explicitly to let an override be cleared.
 */

const overrideAmount = z.coerce.number().min(0).nullable().optional();

export const payrollDeductionOverrideCreateSchema = z.object({
  employee_id: z.string().uuid(),
  tax: overrideAmount,
  other: overrideAmount,
});

export const payrollDeductionOverrideUpdateSchema = z.object({
  tax: overrideAmount,
  other: overrideAmount,
});

export type PayrollDeductionOverrideCreate = z.infer<typeof payrollDeductionOverrideCreateSchema>;
export type PayrollDeductionOverrideUpdate = z.infer<typeof payrollDeductionOverrideUpdateSchema>;

export const payrollDeductionOverridesResource: ResourceDefinition<
  PayrollDeductionOverrideCreate,
  PayrollDeductionOverrideUpdate
> = {
  name: "payroll-deduction-overrides",
  table: "payroll_deduction_overrides",
  tenantScoped: true,
  createSchema: payrollDeductionOverrideCreateSchema,
  updateSchema: payrollDeductionOverrideUpdateSchema,
  filterFields: ["employee_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "finance_admin"],
    write: ["hospital_admin", "hr_admin", "finance_admin"],
  },
};
