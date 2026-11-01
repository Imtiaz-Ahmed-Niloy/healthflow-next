import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * GET /api/v1/dashboard
 *
 * Real-time hospital executive command center dashboard.
 * Queries live data across patients, doctors, beds, appointments, admissions,
 * finance invoices, and lab orders for the authenticated hospital tenant.
 */

const ADMIN_ROLES: AppRole[] = [
  "hospital_admin",
  "hr_admin",
  "finance_admin",
  "lab_admin",
  "pharmacy_admin",
];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !ADMIN_ROLES.includes(auth.role)) {
    return fail("Not allowed", 403);
  }

  const supabase = await createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    patients,
    activeDoctors,
    availableBeds,
    totalBeds,
    occupiedBeds,
    cleaningBeds,
    todayAppointments,
    allUpcomingAppointments,
    activeAdmissions,
    todayAdmissions,
    todayDischarges,
    financeInvoices,
    pendingLabOrders,
    recentAdmissions,
    recentAppointments,
  ] = await Promise.all([
    // Patients total
    supabase.from("patients").select("id", { count: "exact", head: true }),

    // Active doctors
    supabase.from("doctors").select("id", { count: "exact", head: true }).eq("status", "active"),

    // Beds by status
    supabase.from("beds").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("beds").select("id", { count: "exact", head: true }),
    supabase.from("beds").select("id", { count: "exact", head: true }).eq("status", "occupied"),
    supabase.from("beds").select("id", { count: "exact", head: true }).eq("status", "cleaning"),

    // Today's appointments
    supabase.from("appointments").select("status").eq("scheduled_date", today),

    // Upcoming appointments
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("scheduled_date", today),

    // Active admissions (currently in hospital)
    supabase
      .from("admissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["admitted", "under_observation", "in_surgery"]),

    // Admissions today
    supabase.from("admissions").select("id", { count: "exact", head: true }).gte("admitted_at", `${today}T00:00:00`),

    // Discharged today
    supabase.from("admissions").select("id", { count: "exact", head: true }).gte("discharged_at", `${today}T00:00:00`),

    // Finance invoices for revenue metrics
    supabase
      .from("finance_invoices")
      .select("amount, paid_at, due_date, kind")
      .gte("due_date", firstDayOfMonth),

    // Pending lab orders
    supabase
      .from("lab_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "sample_collected", "processing"]),

    // Recent 5 active admissions with patient info
    supabase
      .from("admissions")
      .select(`
        id,
        status,
        priority,
        admitted_at,
        diagnosis,
        patients (id, full_name, mrn, gender)
      `)
      .order("admitted_at", { ascending: false })
      .limit(5),

    // Recent 5 appointments today / upcoming with patient & doctor info
    supabase
      .from("appointments")
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        status,
        department,
        patients (id, full_name, phone),
        doctors (id, name, specialty)
      `)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true })
      .limit(5),
  ]);

  // Compute appointment counts for today
  let todayScheduled = 0;
  let todayCompleted = 0;
  let todayCancelled = 0;
  (todayAppointments.data ?? []).forEach((apt) => {
    if (apt.status === "scheduled") todayScheduled++;
    else if (apt.status === "completed") todayCompleted++;
    else if (apt.status === "cancelled") todayCancelled++;
  });

  // Compute revenue
  let monthRevenue = 0;
  let todayRevenue = 0;
  let outstandingReceivables = 0;

  (financeInvoices.data ?? []).forEach((inv) => {
    const amt = Number(inv.amount || 0);
    if (inv.kind === "receivable") {
      if (inv.paid_at) {
        monthRevenue += amt;
        if (inv.paid_at.startsWith(today)) {
          todayRevenue += amt;
        }
      } else {
        outstandingReceivables += amt;
      }
    }
  });

  return json({
    data: {
      patients: { total: patients.count ?? 0 },
      doctors: { active: activeDoctors.count ?? 0 },
      beds: {
        available: availableBeds.count ?? 0,
        occupied: occupiedBeds.count ?? 0,
        cleaning: cleaningBeds.count ?? 0,
        total: totalBeds.count ?? 0,
        occupancyRate:
          (totalBeds.count ?? 0) > 0
            ? Math.round(((occupiedBeds.count ?? 0) / (totalBeds.count ?? 1)) * 100)
            : 0,
      },
      appointments: {
        upcoming: allUpcomingAppointments.count ?? 0,
        todayTotal: (todayAppointments.data ?? []).length,
        todayScheduled,
        todayCompleted,
        todayCancelled,
      },
      admissions: {
        active: activeAdmissions.count ?? 0,
        todayAdmitted: todayAdmissions.count ?? 0,
        todayDischarged: todayDischarges.count ?? 0,
      },
      finance: {
        todayRevenue,
        monthRevenue,
        outstandingReceivables,
      },
      labs: {
        pendingCount: pendingLabOrders.count ?? 0,
      },
      recentAdmissions: recentAdmissions.data ?? [],
      recentAppointments: recentAppointments.data ?? [],
    },
  });
};
