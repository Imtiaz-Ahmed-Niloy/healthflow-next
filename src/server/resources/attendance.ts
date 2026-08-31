import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Attendance, leave and the hospital's holiday calendar (0050).
 *
 * Three small resources in one file: they are one screen, they are never used
 * apart, and splitting them would be three files of ten lines each.
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(1000).nullable().optional());
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real date");
const clockTime = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM").nullable().optional(),
);

/** HR records about named staff. Same two desks that hold payroll. */
const HR_ROLES = ["hospital_admin", "hr_admin"] as const;

// ---------------------------------------------------------------------------

export const attendanceCreateSchema = z.object({
  employee_id: z.string().uuid("Pick an employee"),
  work_date: isoDate,
  check_in: clockTime,
  check_out: clockTime,
  status: z.enum(["present", "late", "absent", "leave", "half_day"]),
  note: optionalText,
  // Worked hours are check_out minus check_in and are deliberately not a
  // column — see 0050.
});

export const attendanceUpdateSchema = attendanceCreateSchema.partial();

export const attendanceRecordsResource: ResourceDefinition<
  z.infer<typeof attendanceCreateSchema>,
  z.infer<typeof attendanceUpdateSchema>
> = {
  name: "attendance-records",
  table: "attendance_records",
  tenantScoped: true,
  createSchema: attendanceCreateSchema,
  updateSchema: attendanceUpdateSchema,
  select: "*, employees ( name, emp_id, department )",
  filterFields: ["employee_id", "work_date", "status"],
  defaultSort: { column: "work_date", ascending: false },
  roles: { read: [...HR_ROLES], write: [...HR_ROLES] },
};

// ---------------------------------------------------------------------------

export const leaveCreateSchema = z
  .object({
    employee_id: z.string().uuid("Pick an employee"),
    type: z.enum(["sick", "casual", "vacation", "maternity", "unpaid"]),
    start_date: isoDate,
    end_date: isoDate,
    reason: optionalText,
    status: z.enum(["pending", "approved", "rejected"]).optional(),
  })
  .refine(v => v.end_date >= v.start_date, {
    message: "Leave cannot end before it starts",
    path: ["end_date"],
  });

/**
 * Not `.partial()` on the refined object — a refinement needs both dates to
 * check, and approving a request sends only `status`. The update schema drops
 * the dates rather than half-checking them; changing the dates of a request is
 * a new request.
 */
export const leaveUpdateSchema = z.object({
  type: z.enum(["sick", "casual", "vacation", "maternity", "unpaid"]).optional(),
  reason: optionalText,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const leaveRequestsResource: ResourceDefinition<
  z.infer<typeof leaveCreateSchema>,
  z.infer<typeof leaveUpdateSchema>
> = {
  name: "leave-requests",
  table: "leave_requests",
  tenantScoped: true,
  createSchema: leaveCreateSchema,
  updateSchema: leaveUpdateSchema,
  select: "*, employees ( name, emp_id, department )",
  filterFields: ["employee_id", "status", "type"],
  defaultSort: { column: "start_date", ascending: false },
  roles: { read: [...HR_ROLES], write: [...HR_ROLES] },
};

// ---------------------------------------------------------------------------

export const holidayCreateSchema = z.object({
  holiday_on: isoDate,
  name: z.string().trim().min(1, "Name the holiday").max(200),
});

export const holidayUpdateSchema = holidayCreateSchema.partial();

export const holidaysResource: ResourceDefinition<
  z.infer<typeof holidayCreateSchema>,
  z.infer<typeof holidayUpdateSchema>
> = {
  name: "holidays",
  table: "holidays",
  tenantScoped: true,
  createSchema: holidayCreateSchema,
  updateSchema: holidayUpdateSchema,
  filterFields: ["holiday_on"],
  defaultSort: { column: "holiday_on", ascending: true },
  roles: {
    // Deliberately wider than the two above: the hospital's calendar is not
    // sensitive, and a doctor looking at a schedule needs to know which days
    // are closed. Matches the RLS in 0050, which gates the other two and not
    // this one.
    read: ["hospital_admin", "hr_admin", "finance_admin", "doctor", "lab_admin", "pharmacy_admin"],
    write: [...HR_ROLES],
  },
};
