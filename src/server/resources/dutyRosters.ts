import { z } from "zod";
import type { ResourceDefinition } from "./types";

const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const dutyRosterCreateSchema = z.object({
  employee_id: z.string().uuid("Pick an employee"),
  department: optionalText,
  shift_name: z.enum(["Morning", "Evening", "Night", "General", "On-Call", "Emergency"]).default("Morning"),
  shift_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD)"),
  start_time: z.string().trim().default("08:00"),
  end_time: z.string().trim().default("14:00"),
  ward_or_unit: optionalText,
  is_on_call: z.coerce.boolean().optional().default(false),
  status: z.enum(["scheduled", "confirmed", "completed", "swapped", "absent"]).optional().default("scheduled"),
  notes: optionalText,
});

export const dutyRosterUpdateSchema = dutyRosterCreateSchema.partial();

export type DutyRosterCreate = z.infer<typeof dutyRosterCreateSchema>;
export type DutyRosterUpdate = z.infer<typeof dutyRosterUpdateSchema>;

export const dutyRostersResource: ResourceDefinition<DutyRosterCreate, DutyRosterUpdate> = {
  name: "duty-rosters",
  table: "duty_rosters",
  tenantScoped: true,
  createSchema: dutyRosterCreateSchema,
  updateSchema: dutyRosterUpdateSchema,
  select: "*, employees ( id, name, emp_id, department, designation, phone )",
  searchFields: ["department", "ward_or_unit", "notes"],
  filterFields: ["employee_id", "shift_name", "shift_date", "status", "is_on_call"],
  defaultSort: { column: "shift_date", ascending: false },
};

