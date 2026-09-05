"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Kpi, SectionTitle, Pill, Btn } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import {
  Users2, UserPlus, Clock3, Wallet, CalendarCheck2, CheckCircle2, XCircle,
  CalendarDays, ArrowRight, ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

/**
 * The HR manager's dashboard, on /api/v1/hr/dashboard.
 *
 * Everything here is counted from `employees`, `attendance_records`,
 * `leave_requests`, `holidays` and `payroll_runs`. The page this replaces
 * carried a headcount trend, a recruitment pipeline, birthdays, an eNPS score
 * and a retention figure, all of them hardcoded — see the route for why each
 * one is gone rather than reimplemented.
 *
 * Leave decisions are the one thing this page WRITES: approving or rejecting
 * goes to /api/v1/leave-requests/:id, the same endpoint Attendance & Leave
 * uses.
 */

type LeaveRow = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  employees: { id: string; name: string; department: string | null } | null;
};

type HrDashboard = {
  headcount: {
    total: number; active: number; probation: number; suspended: number;
    left: number; onboarding: number; on_leave_today: number;
  };
  monthly_salary_bill: number;
  last_payroll_run: {
    id: string; period: string; status: string;
    gross_total: number; net_total: number; headcount: number;
  } | null;
  departments: { name: string; value: number }[];
  attendance_week: { date: string; present: number; late: number; leave: number; absent: number; half_day: number }[];
  pending_leave: LeaveRow[];
  upcoming_holidays: { id: string; name: string; holiday_on: string }[];
};

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))",
  "hsl(var(--chip))", "hsl(var(--muted))",
];

const LEAVE_LABEL: Record<string, string> = {
  sick: "Sick", casual: "Casual", vacation: "Vacation",
  maternity: "Maternity", unpaid: "Unpaid",
};

/** Inclusive, because a one-day leave runs start = end. */
const days = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;

const HRPage = () => {
  const { formatDate, formatCurrency } = useFormatters();
  const [data, setData] = useState<HrDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/hr/dashboard");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || "Couldn't load the HR dashboard.");
        return;
      }
      setError(null);
      setData(body.data);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setDeciding(id);
    try {
      const res = await fetch(`/api/v1/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't record that decision.");
        return;
      }
      toast.success(status === "approved" ? "Leave approved" : "Leave rejected");
      await load();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setDeciding(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="HR Dashboard" subtitle="People · Attendance · Payroll">
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="HR Dashboard" subtitle="People · Attendance · Payroll">
        <Card className="p-10 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-3" />
          <p className="text-sm text-foreground/80">{error ?? "No data."}</p>
          <Btn variant="outline" className="mt-4" onClick={() => { setLoading(true); void load(); }}>Try again</Btn>
        </Card>
      </AdminLayout>
    );
  }

  const { headcount, departments, attendance_week, pending_leave, upcoming_holidays, last_payroll_run } = data;
  const week = attendance_week.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
  }));
  const clockedThisWeek = week.some(d => d.present + d.late + d.leave + d.absent + d.half_day > 0);

  return (
    <AdminLayout title="HR Dashboard" subtitle="People · Attendance · Payroll">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi icon={Users2} label="On the payroll" value={String(headcount.total)} />
        <Kpi icon={CheckCircle2} label="Active" value={String(headcount.active)} tone="accent" />
        <Kpi icon={UserPlus} label="Onboarding" value={String(headcount.onboarding)} tone="chip" />
        <Kpi icon={Clock3} label="On leave today" value={String(headcount.on_leave_today)} tone="chip" />
        <Kpi icon={CalendarCheck2} label="Leave to decide" value={String(pending_leave.length)}
          tone={pending_leave.length ? "destructive" : "primary"} />
        <Kpi icon={Wallet} label="Monthly salary bill" value={formatCurrency(data.monthly_salary_bill)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="This week's attendance"
            action={<Link href="/admin/attendance" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Attendance & Leave <ArrowRight className="h-3.5 w-3.5" />
            </Link>}
          />
          {clockedThisWeek ? (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={week}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" stackId="a" fill="hsl(var(--primary))" name="Present" />
                  <Bar dataKey="late" stackId="a" fill="hsl(var(--primary-glow))" name="Late" />
                  <Bar dataKey="half_day" stackId="a" fill="hsl(var(--accent))" name="Half day" />
                  <Bar dataKey="leave" stackId="a" fill="hsl(var(--chip))" name="Leave" />
                  <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive))" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nobody has been clocked in or out in the last seven days.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Department mix" />
          {departments.length ? (
            <>
              <div className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={departments} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="100%" paddingAngle={2}>
                      {departments.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-1.5">
                {departments.slice(0, 6).map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-primary">{d.value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No employees on the register yet.</p>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle
            title="Leave to decide"
            action={pending_leave.length ? <Pill tone="warn">{pending_leave.length} pending</Pill> : <Pill tone="ok">Nothing waiting</Pill>}
          />
          {pending_leave.length ? (
            <div className="divide-y divide-border/40">
              {pending_leave.map(l => (
                <div key={l.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate">{l.employees?.name ?? "Unknown employee"}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEAVE_LABEL[l.type] ?? l.type} · {formatDate(l.start_date)} – {formatDate(l.end_date)} · {days(l.start_date, l.end_date)} day
                      {days(l.start_date, l.end_date) === 1 ? "" : "s"}
                      {l.employees?.department ? ` · ${l.employees.department}` : ""}
                    </p>
                    {l.reason && <p className="text-xs text-foreground/70 mt-0.5 truncate">{l.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" disabled={deciding === l.id} onClick={() => decide(l.id, "approved")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-60">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button type="button" disabled={deciding === l.id} onClick={() => decide(l.id, "rejected")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border disabled:opacity-60">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No leave requests are waiting on a decision.</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle
              title="Last payroll run"
              action={<Link href="/admin/payroll" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Payroll <ArrowRight className="h-3.5 w-3.5" />
              </Link>}
            />
            {last_payroll_run ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-semibold text-primary">{last_payroll_run.period}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Pill tone={last_payroll_run.status === "paid" ? "ok" : last_payroll_run.status === "approved" ? "info" : "warn"}>
                    {last_payroll_run.status}
                  </Pill>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Staff paid</span>
                  <span className="font-semibold text-primary">{last_payroll_run.headcount}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-muted-foreground">Net paid</span>
                  <span className="font-semibold text-primary">{formatCurrency(Number(last_payroll_run.net_total))}</span>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No payroll run yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Upcoming holidays" action={<CalendarDays className="h-4 w-4 text-primary-glow" />} />
            {upcoming_holidays.length ? (
              <ul className="space-y-2">
                {upcoming_holidays.map(h => (
                  <li key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{h.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(h.holiday_on)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing on the calendar.</p>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HRPage;
