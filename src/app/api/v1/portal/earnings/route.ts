import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { myDoctorRows } from "@/server/portal/myDoctors";
import {
  DEFAULT_EARNINGS_CALCULATION_SETTINGS,
  calculateConsultationSettlement,
  type EarningsCalculationSettings,
} from "@/lib/portal/earningsSettings";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only doctors can access their earnings", 403);

  const supabase = await createServerSupabase();

  let doctorProfiles;
  try {
    doctorProfiles = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load doctor profile", 500);
  }

  if (!doctorProfiles.length) {
    return fail("No doctor profiles found for this account", 404);
  }

  const doctorIds = doctorProfiles.map((d) => d.id);
  const tenantIds = Array.from(new Set(doctorProfiles.map((d) => d.tenant_id)));

  // Fetch consultation fees for these doctor records
  const { data: doctorsData, error: docError } = await supabase
    .from("doctors")
    .select("id, name, tenant_id, consultation_fee")
    .in("id", doctorIds);

  if (docError) {
    return fail(docError.message, 500);
  }

  // Fetch tenants to determine kind (chamber vs hospital)
  const { data: tenantRows } = await supabase
    .from("tenants")
    .select("id, name, kind")
    .in("id", tenantIds);
  const tenantKindMap = new Map<string, string>();
  (tenantRows ?? []).forEach((t) => tenantKindMap.set(t.id, t.kind));

  // Load saved settings from user metadata if available
  const { data: userData } = await supabase.auth.getUser();
  const rawSavedSettings = userData?.user?.user_metadata?.earnings_calculation_settings as
    | Partial<EarningsCalculationSettings>
    | undefined;

  const activeSettings: EarningsCalculationSettings = {
    ...DEFAULT_EARNINGS_CALCULATION_SETTINGS,
    ...(rawSavedSettings ?? {}),
    facilities: {
      ...(DEFAULT_EARNINGS_CALCULATION_SETTINGS.facilities ?? {}),
      ...(rawSavedSettings?.facilities ?? {}),
    },
  };

  const doctorFeeMap = new Map<string, number>();
  (doctorsData ?? []).forEach((d) => {
    doctorFeeMap.set(d.id, Number(d.consultation_fee || activeSettings.default_consultation_fee || 500));
  });

  // Build full workplace facility list for the calculation settings dialog
  const facilitiesList = doctorProfiles.map((p) => {
    const docRow = (doctorsData ?? []).find((d) => d.id === p.id);
    const kind = tenantKindMap.get(p.tenant_id) || "hospital";
    const currentFee = Number(docRow?.consultation_fee || activeSettings.default_consultation_fee || 500);
    const savedFacility = activeSettings.facilities?.[p.tenant_id];

    return {
      tenant_id: p.tenant_id,
      doctor_id: p.id,
      facility_name: p.hospital_name,
      kind,
      consultation_fee: savedFacility?.consultation_fee ?? currentFee,
      doctor_share_percentage:
        savedFacility?.doctor_share_percentage ??
        (kind === "chamber" ? 100 : activeSettings.default_doctor_share_percentage),
      facility_deduction: savedFacility?.facility_deduction ?? activeSettings.facility_deduction,
      override_global: Boolean(savedFacility?.override_global),
    };
  });

  // Fetch all completed appointments for this doctor
  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(`
      id,
      tenant_id,
      doctor_id,
      patient_id,
      scheduled_date,
      completed_at,
      department,
      status,
      patients (
        id,
        full_name,
        mrn
      ),
      tenants (
        id,
        name
      )
    `)
    .in("doctor_id", doctorIds)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false })
    .limit(200);

  if (apptError) {
    return fail(apptError.message, 500);
  }

  const apptRows = appointments ?? [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  let totalEarnings = 0;
  let totalDoctorShare = 0;
  let todayEarnings = 0;
  let todayDoctorShare = 0;
  let weekEarnings = 0;
  let weekDoctorShare = 0;
  let monthEarnings = 0;
  let monthDoctorShare = 0;

  const totalPatients = apptRows.length;
  let todayPatients = 0;
  let weekPatients = 0;
  let monthPatients = 0;

  const placeMap = new Map<
    string,
    {
      place_id: string;
      place_name: string;
      kind: string;
      count: number;
      total_fee: number;
      doctor_share: number;
      hospital_cut: number;
      share_percentage: number;
      consultation_fee: number;
    }
  >();

  const consultationLedger = apptRows.map((a: any) => {
    const rawFee = doctorFeeMap.get(a.doctor_id) || activeSettings.default_consultation_fee || 500;
    const date = a.scheduled_date || a.completed_at?.slice(0, 10) || todayStr;
    const hospitalName = a.tenants?.name || "Chamber";
    const patientName = a.patients?.full_name || "Patient";
    const patientMrn = a.patients?.mrn || "";
    const kind = tenantKindMap.get(a.tenant_id) || "hospital";

    const calc = calculateConsultationSettlement(rawFee, a.tenant_id, activeSettings);

    totalEarnings += calc.fee;
    totalDoctorShare += calc.net_doctor_payout;

    if (date === todayStr) {
      todayEarnings += calc.fee;
      todayDoctorShare += calc.net_doctor_payout;
      todayPatients += 1;
    }
    if (date >= sevenDaysAgo) {
      weekEarnings += calc.fee;
      weekDoctorShare += calc.net_doctor_payout;
      weekPatients += 1;
    }
    if (date >= monthStartStr) {
      monthEarnings += calc.fee;
      monthDoctorShare += calc.net_doctor_payout;
      monthPatients += 1;
    }

    const currentPlace = placeMap.get(a.tenant_id) || {
      place_id: a.tenant_id,
      place_name: hospitalName,
      kind,
      count: 0,
      total_fee: 0,
      doctor_share: 0,
      hospital_cut: 0,
      share_percentage: calc.share_percentage,
      consultation_fee: calc.fee,
    };
    currentPlace.count += 1;
    currentPlace.total_fee += calc.fee;
    currentPlace.doctor_share += calc.net_doctor_payout;
    currentPlace.hospital_cut += calc.hospital_cut;
    currentPlace.consultation_fee = calc.fee;
    currentPlace.share_percentage = calc.share_percentage;
    placeMap.set(a.tenant_id, currentPlace);

    return {
      appointment_id: a.id,
      date,
      patient_name: patientName,
      patient_mrn: patientMrn,
      hospital_name: hospitalName,
      tenant_id: a.tenant_id,
      fee: calc.fee,
      doctor_share: calc.net_doctor_payout,
      gross_doctor_share: calc.gross_doctor_share,
      facility_deduction: calc.facility_deduction,
      tax_deduction: calc.tax_deduction,
      share_percentage: calc.share_percentage,
      settlement_status: "settled",
    };
  });

  return json({
    data: {
      summary: {
        total_earnings: totalEarnings,
        doctor_share: totalDoctorShare,
        hospital_share: Math.max(0, totalEarnings - totalDoctorShare),
        today_earnings: todayEarnings,
        today_doctor_share: todayDoctorShare,
        week_earnings: weekEarnings,
        week_doctor_share: weekDoctorShare,
        month_earnings: monthEarnings,
        month_doctor_share: monthDoctorShare,
        total_patients: totalPatients,
        today_patients: todayPatients,
        week_patients: weekPatients,
        month_patients: monthPatients,
      },
      places: Array.from(placeMap.values()),
      ledger: consultationLedger.slice(0, 50),
      settings: activeSettings,
      facilities: facilitiesList,
    },
  });
};

export const PATCH = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only doctors can configure their earnings", 403);

  const body = (await request.json().catch(() => null)) as Partial<EarningsCalculationSettings> | null;
  if (!body || typeof body !== "object") return fail("Invalid settings payload", 422);

  const supabase = await createServerSupabase();

  // Validate and sanitize calculation fee settings
  const cleanSettings: EarningsCalculationSettings = {
    default_doctor_share_percentage: Math.max(
      0,
      Math.min(100, Number(body.default_doctor_share_percentage ?? 80))
    ),
    default_consultation_fee: Math.max(0, Number(body.default_consultation_fee ?? 500)),
    facility_deduction: Math.max(0, Number(body.facility_deduction ?? 0)),
    tax_deduction_percentage: Math.max(
      0,
      Math.min(100, Number(body.tax_deduction_percentage ?? 0))
    ),
    facilities: {},
  };

  if (body.facilities && typeof body.facilities === "object") {
    for (const [tenantId, f] of Object.entries(body.facilities)) {
      if (!f || typeof f !== "object") continue;
      cleanSettings.facilities[tenantId] = {
        tenant_id: tenantId,
        facility_name: String(f.facility_name ?? "Facility"),
        kind: f.kind ? String(f.kind) : undefined,
        consultation_fee: Math.max(0, Number(f.consultation_fee ?? cleanSettings.default_consultation_fee)),
        doctor_share_percentage: Math.max(
          0,
          Math.min(100, Number(f.doctor_share_percentage ?? cleanSettings.default_doctor_share_percentage))
        ),
        facility_deduction: Math.max(0, Number(f.facility_deduction ?? cleanSettings.facility_deduction)),
        override_global: Boolean(f.override_global),
      };

      // If the facility is a chamber and consultation_fee changed, attempt to sync to the chamber
      if (f.kind === "chamber" && typeof f.consultation_fee === "number") {
        try {
          await supabase.rpc("update_chamber", {
            p_tenant_id: tenantId,
            p_name: f.facility_name || "Chamber",
            p_consultation_fee: f.consultation_fee,
          });
        } catch {
          // Soft ignore if update_chamber has extra requirements; the calculation settings will still govern
        }
      }
    }
  }

  // Save to user metadata
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      earnings_calculation_settings: cleanSettings,
    },
  });

  if (metaError) {
    return fail(metaError.message, 500);
  }

  return json({ data: { success: true, settings: cleanSettings } });
};
