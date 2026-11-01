import { z } from "zod";
import type { ResourceDefinition } from "./types";

const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const exitClearanceCreateSchema = z.object({
  employee_id: z.string().uuid("Pick an employee"),
  resignation_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  last_working_day: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  reason_for_leaving: optionalText,
  pharmacy_cleared: z.coerce.boolean().optional().default(false),
  pharmacy_notes: optionalText,
  it_assets_cleared: z.coerce.boolean().optional().default(false),
  it_notes: optionalText,
  library_records_cleared: z.coerce.boolean().optional().default(false),
  accounts_finance_cleared: z.coerce.boolean().optional().default(false),
  accounts_notes: optionalText,
  hr_admin_cleared: z.coerce.boolean().optional().default(false),
  final_settlement_status: z.enum(["pending", "calculated", "disbursed", "on_hold"]).default("pending"),
  service_certificate_issued: z.coerce.boolean().optional().default(false),
  notes: optionalText,
});

export const exitClearanceUpdateSchema = exitClearanceCreateSchema.partial();

export type ExitClearanceCreate = z.infer<typeof exitClearanceCreateSchema>;
export type ExitClearanceUpdate = z.infer<typeof exitClearanceUpdateSchema>;

export const exitClearancesResource: ResourceDefinition<ExitClearanceCreate, ExitClearanceUpdate> = {
  name: "exit-clearances",
  table: "exit_clearances",
  tenantScoped: true,
  createSchema: exitClearanceCreateSchema,
  updateSchema: exitClearanceUpdateSchema,
  select: "*, employees ( id, name, emp_id, department, designation, phone, email )",
  searchFields: ["reason_for_leaving", "notes"],
  filterFields: ["employee_id", "final_settlement_status", "service_certificate_issued", "hr_admin_cleared"],
  defaultSort: { column: "last_working_day", ascending: false },
};

