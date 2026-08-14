import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Support staff — served at /api/v1/support-staff, stored in
 * `public.support_staff`.
 *
 * The non-clinical people behind /admin/support-staff: cleaners, guards,
 * technicians, kitchen and transport. One row per person, grouped by
 * department.
 */

export const SUPPORT_DEPARTMENTS = [
  "Janitorial",
  "Security",
  "Maintenance",
  "Kitchen",
  "Transport",
] as const;

export const SUPPORT_STATUSES = ["active", "on_leave", "suspended"] as const;

/**
 * "" means the field was emptied on purpose, so it maps to null. `undefined`
 * would mean "leave this alone" — PATCH drops undefined keys, so without this
 * a phone number or job title could never be cleared once it had been set.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);

const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

export const supportStaffCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),

  /**
   * Required, unlike most selects here. The column is NOT NULL with no default
   * — see 0015_support_staff.sql for why a default would be worse than an
   * error.
   */
  department: z.enum(SUPPORT_DEPARTMENTS, {
    errorMap: () => ({ message: "Pick a department" }),
  }),

  role: nullableText(120),
  phone: nullableText(50),
  email: z.preprocess(
    blankToNull,
    z.string().trim().email("Enter a valid email address").nullable().optional(),
  ),
  status: z.enum(SUPPORT_STATUSES).optional(),
  notes: nullableText(2000),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const supportStaffUpdateSchema = supportStaffCreateSchema.partial();

export type SupportStaffCreate = z.infer<typeof supportStaffCreateSchema>;
export type SupportStaffUpdate = z.infer<typeof supportStaffUpdateSchema>;

export const supportStaffResource: ResourceDefinition<
  SupportStaffCreate,
  SupportStaffUpdate
> = {
  name: "support-staff",
  table: "support_staff",
  tenantScoped: true,
  createSchema: supportStaffCreateSchema,
  updateSchema: supportStaffUpdateSchema,
  searchFields: ["name", "department", "role", "phone", "email"],
  filterFields: ["status", "department"],
  defaultSort: { column: "name", ascending: true },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
