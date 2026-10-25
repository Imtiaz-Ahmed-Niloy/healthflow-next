"use client";

import { motion } from "framer-motion";
import {
  Briefcase, FileText, CalendarPlus, Stethoscope, TestTube2, Receipt, PhoneCall,
  Activity, Heart, ShieldAlert, Sparkles, RotateCw, ExternalLink, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { useSession, displayName } from "@/lib/auth/useSession";
import { phoneOfLoginEmail } from "@/lib/phone";
import { useFormatters } from "@/lib/appSettings";
import { QrCodeSvg } from "@/components/common/QrCodeSvg";
import { Button } from "@/components/ui/button";

type UpcomingAppointment = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "completed" | "cancelled";
  department: string | null;
  doctor: { name: string; specialty: string | null } | null;
  hospital: { name: string | null } | null;
};

type RecentVisit = {
  id: string;
  date: string;
  doctor_name: string | null;
  doctor_specialty: string | null;
  hospital_name: string | null;
  diagnosis: string[];
  complaints: string[];
  blood_pressure: string | null;
};

type PatientProfileData = {
  blood_group?: string | null;
  weight_kg?: number | null;
  height_feet?: number | null;
  height_inches?: number | null;
  emergency_contact_phone?: string | null;
  emergency_contact_name?: string | null;
};

type HospitalLink = {
  id: string;
  mrn: string;
  tenants: { name: string } | null;
};

const formatDate = (iso: string, locale: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { month: "short", day: "2-digit" });

const formatTime = (t: string) => {
  const [hh, mm] = (t || "10:00").split(":");
  const h = parseInt(hh, 10);
  return `${((h + 11) % 12 + 1).toString().padStart(2, "0")}:${mm} ${h >= 12 ? "PM" : "AM"}`;
};

const BLOOD_GROUP_LABELS: Record<string, string> = {
  o_positive: "O+", o_negative: "O−",
  a_positive: "A+", a_negative: "A−",
  b_positive: "B+", b_negative: "B−",
  ab_positive: "AB+", ab_negative: "AB−",
};

const Dashboard = () => {
  const t = useTranslations("patient.dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useSession();
  const { formatCurrency: fmt } = useFormatters();

  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [visits, setVisits] = useState<RecentVisit[]>([]);
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [hospitalLinks, setHospitalLinks] = useState<HospitalLink[]>([]);
  const [labOrdersCount, setLabOrdersCount] = useState(0);
  const [outstandingBills, setOutstandingBills] = useState(0);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [apptsRes, recordsRes, profileRes, billingRes, labRes] = await Promise.allSettled([
          fetch("/api/v1/patient/appointments"),
          fetch("/api/v1/patient/medical-records"),
          fetch("/api/v1/patient/profile"),
          fetch("/api/v1/patient/billing"),
          fetch("/api/v1/patient/lab-reports"),
        ]);

        if (!active) return;

        if (apptsRes.status === "fulfilled" && apptsRes.value.ok) {
          const body = await apptsRes.value.json().catch(() => null);
          setAppointments(body?.data ?? []);
        }

        if (recordsRes.status === "fulfilled" && recordsRes.value.ok) {
          const body = await recordsRes.value.json().catch(() => null);
          setVisits(body?.data?.visits ?? []);
        }

        if (profileRes.status === "fulfilled" && profileRes.value.ok) {
          const body = await profileRes.value.json().catch(() => null);
          setProfile(body?.data?.profile ?? null);
          setHospitalLinks(body?.data?.hospitals ?? []);
        }

        if (billingRes.status === "fulfilled" && billingRes.value.ok) {
          const body = await billingRes.value.json().catch(() => null);
          setOutstandingBills(body?.data?.summary?.outstanding ?? 0);
          setPendingInvoicesCount(body?.data?.invoices?.filter((i: { paid_at: string | null }) => !i.paid_at).length ?? 0);
        }

        if (labRes.status === "fulfilled" && labRes.value.ok) {
          const body = await labRes.value.json().catch(() => null);
          setLabOrdersCount(body?.data?.length ?? 0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const upcoming = useMemo(
    () => appointments.filter(a => a.status === "scheduled").slice(0, 3),
    [appointments]
  );

  const primaryMrn = hospitalLinks[0]?.mrn ?? "HF-PT-" + (user?.id ? user.id.slice(0, 6).toUpperCase() : "REG");
  const bloodGroupLabel = profile?.blood_group ? BLOOD_GROUP_LABELS[profile.blood_group] ?? profile.blood_group : null;
  const latestBp = visits.find(v => v.blood_pressure)?.blood_pressure ?? null;

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_feet) return null;
    const totalInches = (profile.height_feet * 12) + (profile.height_inches ?? 0);
    const heightMeters = totalInches * 0.0254;
    if (heightMeters <= 0) return null;
    const val = (profile.weight_kg / (heightMeters * heightMeters)).toFixed(1);
    const num = parseFloat(val);
    let status = "Normal";
    let color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    if (num < 18.5) {
      status = "Underweight";
      color = "text-amber-500 bg-amber-500/10 border-amber-500/30";
    } else if (num >= 25 && num < 30) {
      status = "Overweight";
      color = "text-amber-600 bg-amber-600/10 border-amber-600/30";
    } else if (num >= 30) {
      status = "Obese";
      color = "text-destructive bg-destructive/10 border-destructive/30";
    }
    return { value: val, status, color };
  }, [profile]);

  return (
    <PatientPortalLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          {/* Hero Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 sm:p-10 shadow-glow relative overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="max-w-xl relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-dark-foreground/15 text-xs font-semibold backdrop-blur mb-3">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> {locale === "bn" ? "স্বাস্থ্যফ্লো পোর্টাল" : "HealthFlow Unified Patient Portal"}
              </span>
              <h1 className="font-display text-4xl sm:text-5xl">{t("hello", { name: displayName(user) })}</h1>
              <p className="mt-2.5 opacity-85 text-sm sm:text-base leading-relaxed">{t("welcome")}</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 relative">
              <Link href="/patient/appointments" className="flex items-center gap-2 rounded-full bg-surface-dark-foreground/15 backdrop-blur px-6 py-3 text-sm font-semibold border border-surface-dark-foreground/20 hover:bg-surface-dark-foreground/25 transition-colors">
                <Briefcase className="h-4 w-4" /> {t("book")}
              </Link>
              <Link href="/patient/find-doctors" className="rounded-full bg-card text-primary px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">
                {t("findDoctors")}
              </Link>
              <Link href="/patient/lab-reports" className="flex items-center gap-2 rounded-full bg-surface-dark-foreground/10 hover:bg-surface-dark-foreground/20 px-5 py-3 text-sm font-medium transition-colors">
                <TestTube2 className="h-4 w-4" /> {locale === "bn" ? "ল্যাব রিপোর্ট" : "Lab Reports"}
              </Link>
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/patient/appointments" className="group rounded-2xl bg-card border border-border/60 p-4 shadow-soft hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{t("quickStats.appointments")}</span>
                <Briefcase className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display text-3xl font-bold text-primary mt-2">
                {loading ? "—" : appointments.filter(a => a.status === "scheduled").length}
              </p>
            </Link>

            <Link href="/patient/medical-records" className="group rounded-2xl bg-card border border-border/60 p-4 shadow-soft hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{t("quickStats.prescriptions")}</span>
                <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display text-3xl font-bold text-primary mt-2">
                {loading ? "—" : visits.length}
              </p>
            </Link>

            <Link href="/patient/lab-reports" className="group rounded-2xl bg-card border border-border/60 p-4 shadow-soft hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{t("quickStats.labReports")}</span>
                <TestTube2 className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display text-3xl font-bold text-primary mt-2">
                {loading ? "—" : labOrdersCount}
              </p>
            </Link>

            <Link href="/patient/billing" className="group rounded-2xl bg-card border border-border/60 p-4 shadow-soft hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{t("quickStats.pendingBills")}</span>
                <Receipt className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-display text-2xl font-bold text-primary mt-2">
                {loading ? "—" : fmt(outstandingBills)}
              </p>
            </Link>
          </div>

          {/* Two Main Cards: Upcoming Appointments & Recent Records */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Appointments Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-3xl bg-chip/40 p-6 border border-border/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-primary">{t("appointments")}</h3>
                  <Link href="/patient/appointments" className="text-xs font-semibold text-primary-glow hover:underline">{t("fullCalendar")}</Link>
                </div>
                {loading ? (
                  <div className="mt-5 flex items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : upcoming.length === 0 ? (
                  <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-border/40 border-dashed py-10 text-center">
                    <CalendarPlus className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-primary">{t("noAppointments")}</p>
                    <p className="text-xs text-muted-foreground max-w-[220px]">{t("noAppointmentsBody")}</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {upcoming.map(a => (
                      <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border/40 p-3 shadow-xs">
                        <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center shrink-0">
                          <Stethoscope className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-primary truncate">{a.doctor?.name ?? t("doctor")}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.department || a.doctor?.specialty || t("general")} · {formatDate(a.scheduled_date, locale)}, {formatTime(a.scheduled_time)}
                          </p>
                        </div>
                        <Link href="/patient/appointments" className="text-xs font-semibold text-primary-glow hover:underline">
                          Pass →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/patient/find-doctors" className="mt-5 block text-center w-full rounded-xl bg-card border border-border py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">
                {t("schedule")}
              </Link>
            </motion.div>

            {/* Recent Records Card with Real Visits */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-3xl bg-chip/40 p-6 border border-border/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-primary">{t("recentRecords")}</h3>
                  <Link href="/patient/medical-records" className="text-xs font-semibold text-primary-glow hover:underline">
                    {t("viewAllRecords")}
                  </Link>
                </div>
                {loading ? (
                  <div className="mt-5 flex items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : visits.length === 0 ? (
                  <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card border border-border/40 border-dashed py-10 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-primary">{t("noRecords")}</p>
                    <p className="text-xs text-muted-foreground max-w-[220px]">{t("noRecordsBody")}</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {visits.slice(0, 3).map(v => (
                      <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border/40 p-3 shadow-xs">
                        <div className="h-10 w-10 rounded-xl bg-chip flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-primary truncate">
                            {v.diagnosis[0] ?? v.complaints[0] ?? (locale === "bn" ? "ডাক্তার পরামর্শ" : "Consultation")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {v.doctor_name ? `Dr. ${v.doctor_name}` : "Doctor"} · {formatDate(v.date, locale)}
                          </p>
                        </div>
                        <Link href="/patient/medical-records" className="text-xs font-semibold text-primary hover:underline">
                          Rx
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/patient/medical-records" className="mt-5 block text-center w-full rounded-xl bg-card border border-border py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors">
                {locale === "bn" ? "প্রেসক্রিপশন ও হিস্ট্রি খুলুন" : "View Clinical Records"}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right Sidebar: Digital Health Card, Vitals, and 24/7 SOS */}
        <div className="space-y-6">
          {/* Digital Patient Health Card (with Flip view) */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-primary text-white p-6 shadow-glow relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-accent">
                  {t("healthCard")}
                </span>
              </div>
              <button
                onClick={() => setCardFlipped(!cardFlipped)}
                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-colors"
                title={t("flipCard")}
              >
                <RotateCw className="h-3.5 w-3.5 text-white/80" />
              </button>
            </div>

            {!cardFlipped ? (
              <div className="mt-5 space-y-4">
                {/* Chip graphic */}
                <div className="h-7 w-9 rounded-md bg-amber-300/80 border border-amber-200/60 shadow-inner flex items-center justify-around px-1">
                  <div className="w-px h-full bg-amber-600/40" />
                  <div className="w-px h-full bg-amber-600/40" />
                </div>

                <div>
                  <p className="text-[10px] tracking-widest font-mono text-white/60">PATIENT / MRN</p>
                  <p className="font-mono text-lg font-bold tracking-wider text-white mt-0.5">{primaryMrn}</p>
                </div>

                <div className="pt-1 flex items-end justify-between">
                  <div>
                    <p className="font-semibold text-base text-white tracking-wide">{displayName(user)}</p>
                    <p className="text-xs text-white/70 mt-0.5">
                      {phoneOfLoginEmail(user?.email) ?? user?.email ?? "—"}
                    </p>
                  </div>
                  {bloodGroupLabel && (
                    <div className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-300 font-bold text-xs flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                      {bloodGroupLabel}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center text-center p-2">
                <div className="p-2 bg-white rounded-xl shadow-md">
                  <QrCodeSvg value={`https://healthflowbd.com/patient/id/${primaryMrn}`} size={96} />
                </div>
                <p className="text-[11px] font-mono text-white/80 mt-2">{primaryMrn}</p>
                <p className="text-[10px] text-white/60 mt-0.5">Scan at hospital front-desk or triage</p>
              </div>
            )}
          </motion.div>

          {/* Health Vitals Card */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/60 p-5 shadow-soft">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <h4 className="font-display text-base text-primary flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> {t("healthVitals")}
              </h4>
              <Link href="/patient/profile" className="text-xs text-primary-glow font-medium hover:underline">
                Edit
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-chip/40 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{t("bloodGroup")}</p>
                <p className="text-base font-bold text-primary mt-1">{bloodGroupLabel ?? "Not set"}</p>
              </div>

              <div className="rounded-xl bg-chip/40 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Blood Pressure</p>
                <p className="text-base font-bold text-primary mt-1">{latestBp ?? "—"}</p>
              </div>

              <div className="rounded-xl bg-chip/40 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Weight & Height</p>
                <p className="text-xs font-semibold text-primary mt-1">
                  {profile?.weight_kg ? `${profile.weight_kg} kg` : "—"} · {profile?.height_feet ? `${profile.height_feet}'${profile.height_inches ?? 0}"` : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-chip/40 p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">BMI Indicator</p>
                {bmiInfo ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-primary">{bmiInfo.value}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bmiInfo.color}`}>
                      {bmiInfo.status}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">—</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* 24/7 SOS Emergency Helplines Widget */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="rounded-3xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 p-5">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <ShieldAlert className="h-4 w-4" />
              <span>{t("sosHelplines")}</span>
            </div>

            <div className="mt-3 space-y-2">
              <a href="tel:999" className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:border-rose-400/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-primary">{t("nationalEmergency")}</p>
                  <p className="text-[10px] text-muted-foreground">Police · Fire · Ambulance</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1">
                  <PhoneCall className="h-3 w-3" /> 999
                </span>
              </a>

              <a href="tel:16263" className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:border-emerald-400/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-primary">{t("healthHelpline")}</p>
                  <p className="text-[10px] text-muted-foreground">Shasthya Batayon Telemedicine</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center gap-1">
                  <PhoneCall className="h-3 w-3" /> 16263
                </span>
              </a>

              <a href="tel:199" className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:border-amber-400/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-primary">{t("ambulance")}</p>
                  <p className="text-[10px] text-muted-foreground">Red Crescent Ambulance</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-amber-600 text-white font-mono font-bold text-xs flex items-center gap-1">
                  <PhoneCall className="h-3 w-3" /> 199
                </span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </PatientPortalLayout>
  );
};

export default Dashboard;
