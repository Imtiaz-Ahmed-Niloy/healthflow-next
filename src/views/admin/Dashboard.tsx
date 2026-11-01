"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Kpi, Pill, Btn, SectionTitle } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import {
  Users, Stethoscope, BedDouble, Calendar, Activity,
  Wallet, TrendingUp, AlertTriangle, ArrowRight, UserPlus,
  Clock, Plus, FlaskConical, Receipt, ChevronRight, CheckCircle2,
  XCircle, Sparkles, Building2,
} from "lucide-react";

type DashboardData = {
  patients: { total: number };
  doctors: { active: number };
  beds: {
    available: number;
    occupied: number;
    cleaning: number;
    total: number;
    occupancyRate: number;
  };
  appointments: {
    upcoming: number;
    todayTotal: number;
    todayScheduled: number;
    todayCompleted: number;
    todayCancelled: number;
  };
  admissions: {
    active: number;
    todayAdmitted: number;
    todayDischarged: number;
  };
  finance: {
    todayRevenue: number;
    monthRevenue: number;
    outstandingReceivables: number;
  };
  labs: {
    pendingCount: number;
  };
  recentAdmissions: Array<{
    id: string;
    status: string;
    priority: "routine" | "urgent" | "critical";
    admitted_at: string;
    diagnosis: string | null;
    patients: { id: string; full_name: string; mrn: string; gender: string | null } | null;
  }>;
  recentAppointments: Array<{
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
    department: string | null;
    patients: { id: string; full_name: string; phone: string | null } | null;
    doctors: { id: string; name: string; specialty: string | null } | null;
  }>;
};

const priorityTone: Record<string, "ok" | "warn" | "bad"> = {
  routine: "ok",
  urgent: "warn",
  critical: "bad",
};

const Dashboard = () => {
  const t = useTranslations("admin.dashboard");
  const { formatCurrency, formatDate } = useFormatters();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/dashboard");
        const body = await res.json().catch(() => null);
        if (active && res.ok && body?.data) {
          setData(body.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Command Center & Quick Actions</h2>
              <p className="text-xs text-muted-foreground">Immediate clinical and administrative workflows</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/patients">
              <Btn variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Register Patient
              </Btn>
            </Link>
            <Link href="/admin/appointments">
              <Btn variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Book OPD Slot
              </Btn>
            </Link>
            <Link href="/admin/admissions">
              <Btn variant="primary" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Admit Patient
              </Btn>
            </Link>
            <Link href="/admin/wards">
              <Btn variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5" /> Bed Grid
              </Btn>
            </Link>
            <Link href="/admin/finance">
              <Btn variant="outline" className="text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Issue Bill
              </Btn>
            </Link>
          </div>
        </div>

        {/* Primary Executive KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            icon={Users}
            label={t("totalPatients")}
            value={loading ? "—" : (data?.patients.total ?? 0).toLocaleString()}
          />
          <Kpi
            icon={BedDouble}
            label={t("availableBeds")}
            value={
              loading
                ? "—"
                : `${data?.beds.available ?? 0} / ${data?.beds.total ?? 0}`
            }
            hint={
              data
                ? `${data.beds.occupancyRate}% occupancy (${data.beds.occupied} occupied)`
                : undefined
            }
            tone={
              (data?.beds.occupancyRate ?? 0) > 85
                ? "destructive"
                : (data?.beds.occupancyRate ?? 0) > 60
                ? "accent"
                : "chip"
            }
          />
          <Kpi
            icon={Activity}
            label="Inpatient Admissions"
            value={loading ? "—" : (data?.admissions.active ?? 0).toLocaleString()}
            hint={
              data
                ? `Today: +${data.admissions.todayAdmitted} in / -${data.admissions.todayDischarged} out`
                : undefined
            }
            tone="accent"
          />
          <Kpi
            icon={Wallet}
            label="Today's Collections"
            value={loading ? "—" : formatCurrency(data?.finance.todayRevenue ?? 0)}
            hint={
              data
                ? `Month: ${formatCurrency(data.finance.monthRevenue)}`
                : undefined
            }
            tone="ok"
          />
        </div>

        {/* Operational Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bed Occupancy Card */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <BedDouble className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bed Occupancy</h3>
                    <p className="text-lg font-bold text-foreground">
                      {data?.beds.occupancyRate ?? 0}% <span className="text-xs text-muted-foreground font-normal">Capacity</span>
                    </p>
                  </div>
                </div>
                <Link href="/admin/wards" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  View Map <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted/60 h-3 rounded-full overflow-hidden flex my-3">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${Math.min(100, data?.beds.occupancyRate ?? 0)}%` }}
                  title={`Occupied: ${data?.beds.occupied}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{
                    width: `${Math.min(100, (((data?.beds.cleaning ?? 0) / (data?.beds.total || 1)) * 100))}%`,
                  }}
                  title={`Cleaning: ${data?.beds.cleaning}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-muted/40 p-2 rounded-xl">
                  <p className="text-[10px] text-muted-foreground font-medium">Available</p>
                  <p className="text-sm font-bold text-emerald-600">{data?.beds.available ?? 0}</p>
                </div>
                <div className="bg-muted/40 p-2 rounded-xl">
                  <p className="text-[10px] text-muted-foreground font-medium">Occupied</p>
                  <p className="text-sm font-bold text-foreground">{data?.beds.occupied ?? 0}</p>
                </div>
                <div className="bg-muted/40 p-2 rounded-xl">
                  <p className="text-[10px] text-muted-foreground font-medium">Cleaning</p>
                  <p className="text-sm font-bold text-amber-600">{data?.beds.cleaning ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total capacity</span>
              <span className="font-semibold text-foreground">{data?.beds.total ?? 0} Beds & Cabins</span>
            </div>
          </Card>

          {/* Today's OPD Status */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-accent text-accent-foreground">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's OPD Queue</h3>
                    <p className="text-lg font-bold text-foreground">
                      {data?.appointments.todayTotal ?? 0} <span className="text-xs text-muted-foreground font-normal">Patients</span>
                    </p>
                  </div>
                </div>
                <Link href="/admin/appointments" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  Schedule <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs my-3">
                <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-blue-700 font-semibold mb-0.5">
                    <Clock className="w-3 h-3" /> Scheduled
                  </div>
                  <p className="text-base font-bold text-blue-800">{data?.appointments.todayScheduled ?? 0}</p>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-emerald-700 font-semibold mb-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </div>
                  <p className="text-base font-bold text-emerald-800">{data?.appointments.todayCompleted ?? 0}</p>
                </div>
                <div className="bg-rose-50/70 border border-rose-100 p-2.5 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-rose-700 font-semibold mb-0.5">
                    <XCircle className="w-3 h-3" /> Cancelled
                  </div>
                  <p className="text-base font-bold text-rose-800">{data?.appointments.todayCancelled ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Total upcoming bookings</span>
              <span className="font-semibold text-foreground">{data?.appointments.upcoming ?? 0}</span>
            </div>
          </Card>

          {/* Clinical & Ancillary Alerts */}
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary-glow/20 text-primary">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diagnostics & Labs</h3>
                    <p className="text-lg font-bold text-foreground">
                      {data?.labs.pendingCount ?? 0} <span className="text-xs text-muted-foreground font-normal">Pending</span>
                    </p>
                  </div>
                </div>
                <Link href="/admin/lab" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  Lab Orders <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2 mt-2">
                <div className="p-2.5 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <span>Active Doctors on Duty</span>
                  </div>
                  <span className="font-bold text-foreground">{data?.doctors.active ?? 0}</span>
                </div>

                <div className="p-2.5 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Uncollected Receivables</span>
                  </div>
                  <span className="font-bold text-amber-700">
                    {formatCurrency(data?.finance.outstandingReceivables ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Hospital status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Normal Operations
              </span>
            </div>
          </Card>
        </div>

        {/* Live Worklist Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active Inpatient Admissions Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Recent Inpatient Admissions</h3>
              </div>
              <Link href="/admin/admissions" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                All Admissions <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(!data?.recentAdmissions || data.recentAdmissions.length === 0) ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active inpatient admissions recorded
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.recentAdmissions.map((adm) => (
                  <div key={adm.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground truncate">
                          {adm.patients?.full_name ?? "Patient"}
                        </span>
                        {adm.patients?.mrn && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded">
                            {adm.patients.mrn}
                          </span>
                        )}
                        <Pill tone={priorityTone[adm.priority] || "ok"}>{adm.priority}</Pill>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {adm.diagnosis ? `Dx: ${adm.diagnosis}` : "Routine admission"} • {formatDate(adm.admitted_at)}
                      </p>
                    </div>
                    <span className="capitalize text-[11px] font-semibold text-primary shrink-0">
                      {adm.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Today's Appointments Schedule */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Upcoming OPD Consultations</h3>
              </div>
              <Link href="/admin/appointments" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                Full Schedule <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {(!data?.recentAppointments || data.recentAppointments.length === 0) ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No consultations scheduled for today
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.recentAppointments.map((apt) => (
                  <div key={apt.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">
                          {apt.patients?.full_name ?? "Patient"}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                          {apt.scheduled_time ? apt.scheduled_time.slice(0, 5) : "—"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Dr. {apt.doctors?.name ?? "Assigned Doctor"} {apt.doctors?.specialty ? `(${apt.doctors.specialty})` : ""}
                      </p>
                    </div>
                    <Pill tone={apt.status === "completed" ? "ok" : apt.status === "cancelled" ? "bad" : "info"}>
                      {apt.status}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
