import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * One row per hospital: the percentages every payslip is derived from (0042).
 *
 * These were in localStorage under "payroll-settings-v1", which meant each
 * admin had a private idea of what "basic" is and the same employee produced
 * different payslips depending on whose browser processed the run.
 */

const percent = z.coerce.number().min(0).max(100);

export const payrollSettingsCreateSchema = z
  .object({
    basic_pct: percent,
    house_rent_pct: percent,
    medical_pct: percent,
    conveyance_pct: percent,
    pf_pct: percent,
    tax_pct: percent,
    tax_threshold: z.coerce.number().min(0),
  })
  .refine(
    (s) => s.basic_pct + s.house_rent_pct + s.medical_pct + s.conveyance_pct === 100,
    {
      message: "Basic, house rent, medical and conveyance must add up to 100%",
      path: ["basic_pct"],
    },
  );

/**
 * Not `.partial()`.
 *
 * The four earnings percentages have to total 100 — the database enforces it —
 * and a partial update cannot be checked against that on its own: raising
 * basic_pct alone is always invalid, and the request would fail as a
 * constraint violation instead of a clear message. The dialog sends the whole
 * set anyway.
 */
export const payrollSettingsUpdateSchema = payrollSettingsCreateSchema;

export type PayrollSettingsCreate = z.infer<typeof payrollSettingsCreateSchema>;
export type PayrollSettingsUpdate = z.infer<typeof payrollSettingsUpdateSchema>;

export const payrollSettingsResource: ResourceDefinition<
  PayrollSettingsCreate,
  PayrollSettingsUpdate
> = {
  name: "payroll-settings",
  table: "payroll_settings",
  tenantScoped: true,
  createSchema: payrollSettingsCreateSchema,
  updateSchema: payrollSettingsUpdateSchema,
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "finance_admin"],
    write: ["hospital_admin", "hr_admin", "finance_admin"],
  },
};
