import { NextRequest } from "next/server";
import { fail, json, pharmacyAccess } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/prescriptions — Query completed doctor consultations and
 * prescriptions within the hospital for one-click dispensing at the pharmacy POS.
 *
 * Query params:
 *   - query: search term matching RX ID, appointment ID, patient MRN, name, or phone
 *   - limit: maximum results to return (default 25)
 */

type MedicineItem = {
  name: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  days?: string;
  meal?: string;
};

/**
 * Parses dosage frequency string (e.g. "1+0+1", "1+1+1", "1 time daily") into daily multiplier.
 */
function parseDailyFrequency(freq: string | undefined): number {
  if (!freq) return 1;
  const f = freq.trim().toLowerCase();

  // Pattern "1+0+1", "1+1+1", "0+0+1", "1+1+1+1", etc.
  if (f.includes("+")) {
    const parts = f.split("+").map((p) => parseFloat(p.trim()) || 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum > 0) return sum;
  }

  if (f.includes("three times") || f.includes("tid") || f.includes("every 8 hours")) return 3;
  if (f.includes("twice") || f.includes("bid") || f.includes("every 12 hours")) return 2;
  if (f.includes("four times") || f.includes("qid") || f.includes("every 6 hours")) return 4;
  if (f.includes("once") || f.includes("daily") || f.includes("od") || f.includes("night") || f.includes("morning")) return 1;

  const num = parseFloat(f);
  return !isNaN(num) && num > 0 ? num : 1;
}

/**
 * Parses days duration string (e.g. "7 days", "14", "1 month") into number of days.
 */
function parseDurationDays(daysStr: string | undefined): number {
  if (!daysStr) return 7;
  const d = daysStr.trim().toLowerCase();

  if (d.includes("month")) {
    const match = d.match(/\d+/);
    const months = match ? parseInt(match[0], 10) : 1;
    return months * 30;
  }
  if (d.includes("week")) {
    const match = d.match(/\d+/);
    const weeks = match ? parseInt(match[0], 10) : 1;
    return weeks * 7;
  }

  const numMatch = d.match(/\d+/);
  if (numMatch) {
    const parsed = parseInt(numMatch[0], 10);
    if (parsed > 0) return parsed;
  }

  return 7;
}

function calculateAge(dobIso: string | null | undefined): string | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  if (ageYears > 0) return `${ageYears}y`;
  const ageMonths = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  return ageMonths > 0 ? `${ageMonths}m` : "Infant";
}

export async function GET(req: NextRequest) {
  const access = await pharmacyAccess("read");
  if ("refusal" in access) return access.refusal;
  const { auth, supabase } = access;

  const { searchParams } = new URL(req.url);
  const rawQuery = (searchParams.get("query") || "").trim();
  const limitParam = parseInt(searchParams.get("limit") || "25", 10);
  const limit = Math.min(Math.max(1, limitParam), 50);

  // Normalize search if user types "RX-XXXX"
  const cleanQuery = rawQuery.replace(/^RX-?/i, "").trim();

  try {
    const queryBuilder = supabase
      .from("appointments")
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        department,
        diagnosis,
        medicines,
        advice,
        doctors (
          id,
          name,
          specialty,
          bmdc_number
        ),
        patients (
          id,
          full_name,
          mrn,
          phone,
          gender,
          date_of_birth
        )
      `)
      .eq("tenant_id", auth.tenantId)
      .eq("status", "completed")
      .neq("medicines", "[]")
      .order("scheduled_date", { ascending: false })
      .limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      return fail(error.message, 400);
    }

    let records = (data || []).map((row: any) => {
      const doc = Array.isArray(row.doctors) ? row.doctors[0] : row.doctors;
      const pat = Array.isArray(row.patients) ? row.patients[0] : row.patients;

      const rawMeds: MedicineItem[] = Array.isArray(row.medicines)
        ? row.medicines
        : typeof row.medicines === "string"
        ? JSON.parse(row.medicines || "[]")
        : [];

      const parsedMeds = rawMeds
        .filter((m) => m && m.name && m.name.trim().length > 0)
        .map((m) => {
          const daily = parseDailyFrequency(m.frequency);
          const days = parseDurationDays(m.days);
          const calculatedQty = Math.max(1, Math.ceil(daily * days));

          return {
            name: m.name.trim(),
            dosage_form: m.dosage_form || "",
            dose: m.dose || "",
            frequency: m.frequency || "",
            days: m.days || "",
            meal: m.meal || "",
            calculated_pieces: calculatedQty,
          };
        });

      const diagnoses: string[] = Array.isArray(row.diagnosis)
        ? row.diagnosis
        : typeof row.diagnosis === "string"
        ? [row.diagnosis]
        : [];

      return {
        id: row.id,
        prescription_number: `RX-${row.id.slice(0, 8).toUpperCase()}`,
        date: row.scheduled_date,
        department: row.department || "General OPD",
        doctor: {
          id: doc?.id || null,
          name: doc?.name || "Hospital Physician",
          specialty: doc?.specialty || "General Medicine",
          bmdc_number: doc?.bmdc_number || "A-00000",
        },
        patient: {
          id: pat?.id || null,
          full_name: pat?.full_name || "Walk-in Patient",
          mrn: pat?.mrn || "—",
          phone: pat?.phone || "",
          gender: pat?.gender || null,
          age: calculateAge(pat?.date_of_birth),
        },
        diagnosis: diagnoses.filter(Boolean),
        medicines: parsedMeds,
      };
    });

    // If query was passed, perform case-insensitive filter
    if (cleanQuery) {
      const q = cleanQuery.toLowerCase();
      records = records.filter((r) => {
        const matchesRx = r.prescription_number.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
        const matchesName = r.patient.full_name.toLowerCase().includes(q);
        const matchesPhone = r.patient.phone && r.patient.phone.includes(q);
        const matchesMrn = r.patient.mrn.toLowerCase().includes(q);
        const matchesDoctor = r.doctor.name.toLowerCase().includes(q);
        const matchesMedicine = r.medicines.some((m) => m.name.toLowerCase().includes(q));
        return matchesRx || matchesName || matchesPhone || matchesMrn || matchesDoctor || matchesMedicine;
      });
    }

    return json({ prescriptions: records });
  } catch (err: any) {
    return fail(err.message || "Failed to fetch prescriptions", 500);
  }
}
