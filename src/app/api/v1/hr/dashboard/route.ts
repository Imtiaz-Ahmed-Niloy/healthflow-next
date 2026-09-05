import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/hr/dashboard
 *
 * Every number on /admin/hr in one response. Sibling of /api/v1/dashboard —
 * an aggregate over several tables rather than CRUD on one, which is why it
 * sits outside createResourceRoute.
 *
 * The page it replaces was a demo: a headcount trend, a recruitment pipeline,
 * birthdays, eNPS and a retention figure, none of which came from anywhere.
 * Everything below is counted from real rows, and what the schema cannot
 * answer is absent rather than invented:
 *
 *   recruitment pipeline, eNPS, retention, birthdays   no table, and
 *                                                      employees has no
 *                                                      date of birth
 *   headcount trend                                    employees records
 *                                                      start_date but not a
 *                                                      history of leavers, so
 *                                                      a six-month line would
 *                                                      be a guess
 *
 * Read through the user-scoped client, so RLS scopes every count to the
 * caller's own hospital. The role gate on `employees`, `attendance_records`
 * and `leave_requests` (0039, 0050) is what keeps this out of a doctor's
 * hands; the check below only turns that into a clean 403.
 */

const HR_ROLES: AppRole[] = ["hospital_admin", "hr_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** Local calendar date, not UTC — same convention as the queue and dashboard. */
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** `job_status` values that mean the person has left. */
const GONE = ["terminated", "resigned"];

type EmployeeRow = {
  id: string;
  department: string | null;
  job_status: string;
  status: string;
  gross_salary: number | null;
  start_date: string | null;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !HR_ROLES.includes(auth.role)) {
    return fail("Not allowed", 403);
  }

  const supabase = await createServerSupabase();

  const today = new Date();
  const todayIso = isoDate(today);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoIso = isoDate(weekAgo);

  const [employeesResult, attendanceResult, leaveResult, holidaysResult, payrollResult] =
    await Promise.all([
      supabase
        .from("employees")
        .select("id, department, job_status, status, gross_salary, start_date")
        .limit(2000),
      // Seven days, not the whole table: this feeds one week's bar chart.
      supabase
        .from("attendance_records")
        .select("work_date, status")
        .gte("work_date", weekAgoIso)
        .lte("work_date", todayIso)
        .limit(5000),
      supabase
        .from("leave_requests")
        .select("id, type, start_date, end_date, status, reason, employees ( id, name, department )")
        .order("start_date", { ascending: true })
        .limit(200),
      supabase
        .from("holidays")
        .select("id, name, holiday_on")
        .gte("holiday_on", todayIso)
        .order("holiday_on", { ascending: true })
        .limit(5),
      // The most recent run, for what the hospital actually paid.
      supabase
        .from("payroll_runs")
        .select("id, period, status, gross_total, net_total, headcount")
        .order("period", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const firstError =
    employeesResult.error || attendanceResult.error || leaveResult.error || holidaysResult.error;
  if (firstError) return fail(firstError.message, 500);

  const employees = (employeesResult.data ?? []) as EmployeeRow[];
  const onPayroll = employees.filter(e => !GONE.includes(e.job_status));

  // Department mix, biggest first. Unassigned staff are counted rather than
  // dropped — a department nobody filled in is a real gap HR should see.
  const byDepartment = new Map<string, number>();
  onPayroll.forEach(e => {
    const key = e.department?.trim() || "Unassigned";
    byDepartment.set(key, (byDepartment.get(key) ?? 0) + 1);
  });

  // One bar per day for the last seven, including days nobody clocked in.
  const days: { date: string; present: number; late: number; leave: number; absent: number; half_day: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: isoDate(d), present: 0, late: 0, leave: 0, absent: 0, half_day: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  (attendanceResult.data ?? []).forEach(row => {
    const i = dayIndex.get(row.work_date);
    if (i === undefined) return;
    const bucket = days[i] as unknown as Record<string, number>;
    if (typeof bucket[row.status] === "number") bucket[row.status] += 1;
  });

  const leave = leaveResult.data ?? [];
  const pending = leave.filter(l => l.status === "pending");

  // Away today: an approved request whose range covers today.
  const onLeaveToday = leave.filter(
    l => l.status === "approved" && l.start_date <= todayIso && l.end_date >= todayIso,
  ).length;

  const monthlySalaryBill = onPayroll.reduce((sum, e) => sum + Number(e.gross_salary ?? 0), 0);

  return json({
    data: {
      headcount: {
        total: onPayroll.length,
        active: onPayroll.filter(e => e.job_status === "active").length,
        probation: onPayroll.filter(e => e.job_status === "probation").length,
        suspended: onPayroll.filter(e => e.job_status === "suspended").length,
        left: employees.length - onPayroll.length,
        // Onboarding is the paperwork, not the job: `status` tracks how far
        // through joining someone is (0039).
        onboarding: onPayroll.filter(e => e.status !== "completed").length,
        on_leave_today: onLeaveToday,
      },
      /** Salary on the books now. The payroll run below is what was paid. */
      monthly_salary_bill: monthlySalaryBill,
      last_payroll_run: payrollResult.error ? null : payrollResult.data,
      departments: Array.from(byDepartment, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      attendance_week: days,
      pending_leave: pending,
      upcoming_holidays: holidaysResult.data ?? [],
    },
  });
};
