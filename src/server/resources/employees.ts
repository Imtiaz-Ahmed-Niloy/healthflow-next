import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The hospital's staff register — served at /api/v1/employees, stored in
 * `public.employees`.
 *
 * Called "onboarding" on the admin page because that is the screen HR spends
 * its time on, but the row outlives onboarding: payroll reads it to decide who
 * gets paid, and attendance reads it to decide who can clock in. See the header
 * of 0039_employees.sql.
 */

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "consultant"] as const;
export const JOB_STATUSES = ["active", "probation", "suspended", "terminated", "resigned"] as const;
export const DOCUMENT_STATUSES = ["pending", "verified", "rejected"] as const;
export const ORIENTATION_STATUSES = ["pending", "scheduled", "completed"] as const;
export const ONBOARDING_STATUSES = ["pending", "in_progress", "completed"] as const;

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/**
 * An empty date input posts "", which Postgres rejects for a `date` column.
 * Same shape as optionalText, kept separate so the max(2000) does not read as
 * if a date could be 2000 characters long.
 */
const optionalDate = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/**
 * Numbers arrive from forms as strings, and a blank input posts "".
 *
 * The blank has to be caught BEFORE coercion: z.coerce.number() reads "" as 0,
 * so the `.or(z.literal(""))` spelling optionalText uses would quietly write a
 * zero salary into a field HR left empty. Narrowing to string | number also
 * stops null, true and [] coercing; anything else becomes NaN, which is
 * rejected. Same fix as payrollRuns.ts.
 */
const blankToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return typeof value === "string" || typeof value === "number" ? value : NaN;
};

const optionalMoney = z.preprocess(
  blankToUndefined,
  z.coerce.number().min(0, "Salary cannot be negative").optional(),
);

export const employeeCreateSchema = z.object({
  emp_id: z.string().trim().min(1, "Employee ID is required").max(60),
  name: z.string().trim().min(1, "Full name is required").max(200),

  father_name: optionalText,
  mother_name: optionalText,
  marital_status: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  religion: z.enum(["islam", "hinduism", "christianity", "buddhism", "other"]).optional(),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  nid: optionalText,
  phone: optionalText,
  email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),

  department: optionalText,
  designation: optionalText,
  employment_type: z.enum(EMPLOYMENT_TYPES).optional(),
  job_status: z.enum(JOB_STATUSES).optional(),
  gross_salary: optionalMoney,
  start_date: optionalDate,
  end_date: optionalDate,
  present_address: optionalText,
  permanent_address: optionalText,

  documents_status: z.enum(DOCUMENT_STATUSES).optional(),
  orientation_status: z.enum(ORIENTATION_STATUSES).optional(),
  status: z.enum(ONBOARDING_STATUSES).optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
  // Accepting it here would let a client write into another hospital.
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export type EmployeeCreate = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

export const employeesResource: ResourceDefinition<EmployeeCreate, EmployeeUpdate> = {
  name: "employees",
  table: "employees",
  tenantScoped: true,
  createSchema: employeeCreateSchema,
  updateSchema: employeeUpdateSchema,
  searchFields: ["emp_id", "name", "department", "designation", "phone", "email", "nid"],
  filterFields: ["status", "job_status", "department", "employment_type"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // hr_admin owns this register; hospital_admin can see and edit it for the
    // same reason it can everything else in its own hospital. finance_admin
    // reads it because payroll is computed from these rows, but does not hire.
    read: ["hospital_admin", "hr_admin", "finance_admin"],
    write: ["hospital_admin", "hr_admin"],
  },
};
