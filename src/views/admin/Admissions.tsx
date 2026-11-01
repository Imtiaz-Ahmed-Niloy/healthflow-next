"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle, Kpi } from "@/components/admin/ui";
import {
  Modal, Field, Input, Select, TextArea, Toolbar,
  DataTable, RowActions, ConfirmDialog, Chips, statusTone, exportCSV,
  type Column,
} from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useTransferBedMutation } from "@/redux/api/bedTransfers";
import { doctorsApi, patientsApi, bedsApi, cabinsApi, type AdmissionRow, type BillLine } from "@/redux/api/resources";
import { useFormatters } from "@/lib/appSettings";
import { BedDouble, UserPlus, LogOut, Activity, Stethoscope, FileText, Printer, ArrowRightLeft, Copy, Check, X } from "lucide-react";
import { BRAND_INFO } from "@/constants/brand";
import { mediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { DateTimeLocalInput } from "@/components/ui/date-input";
import { DischargeSummaryModal } from "@/components/admin/DischargeSummaryModal";
import { printIpdInvoice } from "@/lib/ipdInvoicePrint";
import {
  PatientByPhoneField,
  type PatientSelectedDetails,
} from "@/components/admin/PatientByPhoneField";
import { usePatientLogin } from "@/components/admin/usePatientLogin";
import type { PatientRow } from "@/redux/api/resources";

/**
 * HF-37 frontend wiring. Real tables now: admissions, bed_stays (via embed),
 * patients, doctors, beds, cabins. See docs/ward-admission-api.md.
 *
 * Two things that don't exist in the mock this replaced:
 * - No "Transferred" status — a transfer is its own action (bed-transfers),
 *   not a status value. See EDITABLE_STATUSES below for the related point
 *   that "discharged" isn't reachable from the plain status dropdown either.
 * - No ward/bed fields on the admission itself — location lives in
 *   bed_stays, read via locationLabel() below, written only through
 *   useAdmitPatient() (create) or useTransferBedMutation() (move/release).
 */

const STATUSES = ["admitted", "under_observation", "in_surgery", "discharged"] as const;
type AdmissionStatus = (typeof STATUSES)[number];

/**
 * The clinical statuses — the strip above the table counts these. Discharged
 * is not one of them: it is the end of the stay, not a state within it.
 *
 * The edit form offers all four. Discharging isn't a plain status flip — it
 * also has to release the bed — so choosing Discharged there runs the same
 * dischargeAdmission() as the row's discharge button, never a bare update.
 * (It used to be left out of the form entirely, which meant editing a
 * discharged admission showed "Admitted" and saving it un-discharged them.)
 */
const EDITABLE_STATUSES = STATUSES.filter(s => s !== "discharged");

const PRIORITIES = ["routine", "urgent", "critical"] as const;
type Priority = (typeof PRIORITIES)[number];

const priorityTone: Record<string, "ok" | "warn" | "bad"> = {
  routine: "ok",
  urgent: "warn",
  critical: "bad",
};


/**
 * A datetime-local input shows and returns wall-clock time with no zone.
 * Filling it from toISOString() showed UTC — six hours behind in Dhaka, so a
 * discharge at 12:22 AM read as 06:22 PM the day before — and sending its
 * value back unconverted had the database read local time as UTC.
 */
const toLocalInput = (d: Date | string) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** An input's local wall-clock value, as the instant the database stores. */
const fromLocalInput = (value: string) => new Date(value).toISOString();

const now = () => toLocalInput(new Date());

const ageFromDob = (dob: string | null) => {
  if (!dob) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
};

/** The open placement, if any — bed_stays carries every placement the admission ever had. */
const currentStay = (a: AdmissionRow) => a.bed_stays.find(s => s.ended_at === null) ?? null;

/** Where a stay put the patient — a bed or a cabin and its number, or nowhere yet. */
type Place = { kind: "bed" | "cabin"; number: string } | null;
const placeOf = (stay: AdmissionRow["bed_stays"][number] | null | undefined): Place => {
  if (stay?.beds) return { kind: "bed", number: String(stay.beds.number) };
  if (stay?.cabins) return { kind: "cabin", number: String(stay.cabins.number) };
  return null;
};

/** The invoice the discharge raised — absent before discharge, and for roles that can't read invoices. */
const invoiceOf = (a: AdmissionRow) => a.finance_invoices?.[0] ?? null;

export type LiveBillDetails = {
  lines: BillLine[];
  total: number;
  days: number;
  startDateStr: string;
  endDateStr: string;
  isDismissed: boolean;
};

/**
 * Computes up-to-date admission bill from admission date (admitted_at)
 * till current date (if not dismissed / still admitted) or till dismissed date (if dismissed).
 */
export const computeAdmissionLiveBill = (
  a: AdmissionRow,
  nowDate: Date = new Date(),
): LiveBillDetails => {
  const isDismissed = a.status === "discharged" || !!a.discharged_at;
  const start = new Date(a.admitted_at);
  const end = isDismissed
    ? new Date(a.discharged_at || a.admitted_at)
    : nowDate;

  const safeEnd = end.getTime() >= start.getTime() ? end : start;
  const msElapsed = safeEnd.getTime() - start.getTime();
  // Minimum 1 day for any admission
  const totalDays = Math.max(1, Math.ceil(msElapsed / (1000 * 60 * 60 * 24)));

  const stays = [...(a.bed_stays ?? [])].sort(
    (x, y) => new Date(x.started_at).getTime() - new Date(y.started_at).getTime(),
  );

  const lines: BillLine[] = [];

  const getStayInfo = (stay: AdmissionRow["bed_stays"][number]) => {
    const cabin = stay.cabins;
    const bed = stay.beds;
    const ward = bed?.wards;

    const desc = cabin
      ? `Cabin ${cabin.number}${cabin.category ? ` (${cabin.category.charAt(0).toUpperCase() + cabin.category.slice(1)})` : ""}`
      : `${ward?.name ?? "Ward"} · Bed ${bed?.number ?? "—"}`;

    const rate = cabin ? Number(cabin.daily_rate) : ward ? Number(ward.daily_rate) : 0;
    const nursing = (!cabin && ward && Number(ward.nursing_charge) > 0) ? Number(ward.nursing_charge) : 0;
    return { desc, rate, nursing, wardName: ward?.name };
  };

  if (stays.length === 0) {
    if (a.admission_bill?.lines && a.admission_bill.lines.length > 0) {
      for (const line of a.admission_bill.lines) {
        const rate = Number(line.rate) || 500;
        lines.push({
          description: line.description,
          quantity: totalDays,
          rate,
          amount: Number((totalDays * rate).toFixed(2)),
        });
      }
    } else {
      const rate = 500;
      lines.push({
        description: "Inpatient General Care & Bed Charges",
        quantity: totalDays,
        rate,
        amount: Number((totalDays * rate).toFixed(2)),
      });
    }
  } else if (stays.length === 1) {
    const info = getStayInfo(stays[0]);
    const rate = info.rate || (Number(a.admission_bill?.lines?.[0]?.rate) || 500);
    lines.push({
      description: info.desc,
      quantity: totalDays,
      rate,
      amount: Number((totalDays * rate).toFixed(2)),
    });
    if (info.nursing > 0) {
      lines.push({
        description: `Nursing care · ${info.wardName ?? "Ward"}`,
        quantity: totalDays,
        rate: info.nursing,
        amount: Number((totalDays * info.nursing).toFixed(2)),
      });
    }
  } else {
    let allocatedDays = 0;
    for (let i = 0; i < stays.length; i++) {
      const stay = stays[i];
      const info = getStayInfo(stay);
      const stayStart = i === 0 ? start : new Date(stay.started_at);
      const isLast = i === stays.length - 1;

      let stayEnd: Date;
      if (isLast) {
        stayEnd = safeEnd;
      } else {
        const nextStart = new Date(stays[i + 1].started_at);
        stayEnd = stay.ended_at ? new Date(stay.ended_at) : nextStart;
        if (stayEnd.getTime() > nextStart.getTime()) {
          stayEnd = nextStart;
        }
      }

      const segmentMs = Math.max(0, stayEnd.getTime() - stayStart.getTime());
      let segDays = Math.ceil(segmentMs / (1000 * 60 * 60 * 24));
      if (segDays < 1 && isLast && allocatedDays === 0) {
        segDays = 1;
      }

      if (segDays > 0) {
        allocatedDays += segDays;
        const rate = info.rate || 500;
        lines.push({
          description: info.desc,
          quantity: segDays,
          rate,
          amount: Number((segDays * rate).toFixed(2)),
        });
        if (info.nursing > 0) {
          lines.push({
            description: `Nursing care · ${info.wardName ?? "Ward"}`,
            quantity: segDays,
            rate: info.nursing,
            amount: Number((segDays * info.nursing).toFixed(2)),
          });
        }
      }
    }

    if (lines.length > 0 && allocatedDays < totalDays) {
      const diff = totalDays - allocatedDays;
      lines[0].quantity += diff;
      lines[0].amount = Number((lines[0].quantity * lines[0].rate).toFixed(2));
    }
  }

  const total = Number(lines.reduce((sum, l) => sum + l.amount, 0).toFixed(2));
  return {
    lines,
    total,
    days: totalDays,
    startDateStr: a.admitted_at,
    endDateStr: isDismissed ? (a.discharged_at ?? a.admitted_at) : safeEnd.toISOString(),
    isDismissed,
  };
};

/** What the stay costs: up-to-date live calculation from admission date to now/discharge date. */
const billTotal = (a: AdmissionRow) => {
  const invoice = invoiceOf(a);
  if (invoice?.paid_at) {
    return Number(invoice.amount);
  }
  return computeAdmissionLiveBill(a).total;
};

type Draft = {
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  priority: string;
  notes: string;
  status: string;
  admitted_at: string;
  /** When they left. Shown, and required, only while the status is Discharged. */
  discharged_at: string;
  /** Admit-only — a fresh admission is placed in the same step it's created. */
  bed_id: string;
  cabin_id: string;
};

const emptyDraft: Draft = {
  patient_id: "", doctor_id: "", diagnosis: "", priority: "routine",
  notes: "", status: "admitted", admitted_at: now(), discharged_at: "", bed_id: "", cabin_id: "",
};

const Admissions = () => {
  const t = useTranslations("admin.admissions");
  const tc = useTranslations("common");
  const statusLabel = (v: string) =>
    (STATUSES as readonly string[]).includes(v) ? t(`statuses.${v as AdmissionStatus}`) : v;
  const priorityLabel = (v: string) =>
    (PRIORITIES as readonly string[]).includes(v) ? t(`priorities.${v as Priority}`) : v;
  const placeLabel = (place: Place) =>
    place ? t(`place.${place.kind}`, { number: place.number }) : t("place.unassigned");
  const locationLabel = (a: AdmissionRow) => placeLabel(placeOf(currentStay(a)));
  const patientName = (a: AdmissionRow | null) => a?.patients?.full_name ?? t("thePatient");

  const crud = useResourceCrud<AdmissionRow>("admissions");
  const { admit } = useAdmitPatient();
  const [transferBed] = useTransferBedMutation();
  const { push, notify } = useNotifications();
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const [createPatient] = patientsApi.useCreate();
  const login = usePatientLogin();
  const [edit, setEdit] = useState<AdmissionRow | null>(null);
  const [add, setAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [patientDetails, setPatientDetails] = useState<PatientSelectedDetails | null>(null);

  const handlePatientChange = useCallback((details: PatientSelectedDetails | null) => {
    setPatientDetails(details);
    const nextPatientId = details && !details.isNew ? details.patientId : "";
    setDraft(d => (d.patient_id === nextPatientId ? d : { ...d, patient_id: nextPatientId }));
  }, []);

  // Small enough lists to load whole — same pattern as Appointments.tsx.
  const { data: patientsData } = patientsApi.useList({ limit: 100 });
  const patients = useMemo(() => patientsData?.data ?? [], [patientsData]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? t("loadingDoctors") : t("notAssigned") },
    ...doctors.map(d => ({ value: d.id, label: d.specialty ? `${d.name} · ${d.specialty}` : d.name })),
  ], [doctors, doctorsLoading, t]);

  // Only vacant beds/cabins are offered — admitting or transferring into an
  // occupied one is exactly what the partial unique indexes behind
  // bed-transfers exist to refuse.
  const { data: bedsData } = bedsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableBeds = useMemo(() => bedsData?.data ?? [], [bedsData]);
  const { data: cabinsData } = cabinsApi.useList({ limit: 100, filters: { status: "available" } });
  const availableCabins = useMemo(() => cabinsData?.data ?? [], [cabinsData]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [hospitalProfile, setHospitalProfile] = useState<{
    name?: string | null;
    tagline?: string | null;
    address?: string | null;
    location?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    logo_url?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHospitalProfile = async () => {
      try {
        const res = await fetch("/api/v1/hospital/profile");
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        if (!cancelled && body?.data) {
          setHospitalProfile(body.data);
        }
      } catch {
        // Fallback values already in place
      }
    };
    void fetchHospitalProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePrintModalInvoice = () => {
    if (!billFor) return;
    const a = billFor;
    const inv = invoiceOf(a);
    const live = computeAdmissionLiveBill(a);
    const lines = (inv?.paid_at && inv.line_items?.length) ? inv.line_items : live.lines;
    const total = (inv?.paid_at) ? Number(inv.amount) : live.total;
    const age = ageFromDob(a.patients?.date_of_birth ?? null);
    const lastStay = a.bed_stays[a.bed_stays.length - 1];
    const location = currentStay(a) ? locationLabel(a) : placeLabel(placeOf(lastStay));
    const reference = inv?.reference || `ADM-${a.id.slice(0, 8).toUpperCase()}`;
    const isSettled = Boolean(inv?.paid_at);

    const hospitalNameStr = hospitalProfile?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
    const hospitalTagline = hospitalProfile?.tagline?.trim() || "Inpatient Department (IPD) · Admission & Bed Services";
    const hospitalAddress = [
      hospitalProfile?.address?.trim(),
      hospitalProfile?.location?.trim(),
    ].filter(Boolean).join(" · ");
    const hospitalPhone = hospitalProfile?.contact_phone?.trim() || "+880 1700-000000";
    const hospitalEmail = hospitalProfile?.contact_email?.trim() || "care@healthflowbd.com";
    const hospitalLogo = (hospitalProfile?.logo_url ? mediaUrl(hospitalProfile.logo_url) : null) || BRAND_INFO.logoMark;

    printIpdInvoice({
      reference,
      generatedAt: formatDateTime(new Date().toISOString()),
      isDismissed: live.isDismissed,
      isSettled,
      hospital: {
        name: hospitalNameStr,
        tagline: hospitalTagline,
        address: hospitalAddress,
        phone: hospitalPhone,
        email: hospitalEmail,
        logoUrl: hospitalLogo,
      },
      patient: {
        name: patientName(a),
        mrn: a.patients?.mrn || undefined,
        phone: a.patients?.phone || undefined,
        age,
        gender: a.patients?.gender || undefined,
        bloodGroup: a.patients?.blood_group || undefined,
      },
      admission: {
        admissionDate: formatDateTime(a.admitted_at),
        calculatedThrough: `${formatDateTime(live.endDateStr)}${!live.isDismissed ? " (Current Date)" : ""}`,
        stayDays: live.days,
        location,
        doctorName: a.doctors?.name || "Attending Consultant",
        doctorSpecialty: a.doctors?.specialty || undefined,
      },
      lines: lines.map((l: any) => ({
        description: l.description,
        subtext: l.subtext || (live.isDismissed ? "Discharged stay charge" : "Billed from admission date to current date"),
        quantity: l.quantity,
        unitLabel: "Days",
        rate: Number(l.rate),
        amount: Number(l.amount),
      })),
      subtotal: total,
      grandTotal: total,
      paymentStatus: isSettled ? "SETTLED & PAID" : live.isDismissed ? "DUE UPON DISCHARGE" : "ACCRUING (LIVE)",
      formatCurrency,
    });
  };

  const handleCopyReference = () => {
    if (!billFor) return;
    const inv = invoiceOf(billFor);
    const ref = inv?.reference || `IPD-${billFor.id.slice(0, 8).toUpperCase()}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref).then(() => {
        setCopied(true);
        toast.success("Bill reference copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  const [del, setDel] = useState<string | null>(null);
  const [discharge, setDischarge] = useState<AdmissionRow | null>(null);
  const [dischargeAt, setDischargeAt] = useState(now());
  const [discharging, setDischarging] = useState(false);
  const [summaryAdmission, setSummaryAdmission] = useState<AdmissionRow | null>(null);
  const [transferring, setTransferring] = useState<AdmissionRow | null>(null);
  const [transferTarget, setTransferTarget] = useState({ bed_id: "", cabin_id: "" });
  // An id, not the row: the bill should follow the list as it refetches.
  const [billId, setBillId] = useState<string | null>(null);
  const billFor = billId ? crud.items.find(a => a.id === billId) ?? null : null;

  const rows = useMemo(() => crud.items.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const place = placeOf(currentStay(a));
      const where = place ? t(`place.${place.kind}`, { number: place.number }) : "";
      return [a.patients?.full_name ?? "", a.doctors?.name ?? "", a.diagnosis ?? "", where]
        .some(v => v.toLowerCase().includes(q));
    }
    return true;
  }), [crud.items, search, statusFilter, t]);

  const active = crud.items.filter(a => a.status !== "discharged");
  const critical = active.filter(a => a.priority === "critical").length;
  const byStatus = (v: string) => active.filter(a => a.status === v).length;
  const todaysAdmits = crud.items.filter(a => toLocalInput(a.admitted_at).slice(0, 10) === now().slice(0, 10)).length;

  const openAdd = () => {
    setDraft({ ...emptyDraft, admitted_at: now() });
    setPatientDetails(null);
    setAdd(true);
  };
  const openEdit = (a: AdmissionRow) => {
    setEdit(a);
    setPatientDetails(null);
    setDraft({
      patient_id: a.patient_id, doctor_id: a.doctor_id ?? "",
      diagnosis: a.diagnosis ?? "", priority: a.priority, notes: a.notes ?? "",
      status: a.status, admitted_at: toLocalInput(a.admitted_at),
      discharged_at: a.discharged_at ? toLocalInput(a.discharged_at) : "",
      bed_id: "", cabin_id: "",
    });
  };

  /** A discharge must come after the admission — the database refuses otherwise. Both are local input values. */
  const dischargeTooEarly = (admittedAt: string, dischargedAt: string) =>
    !!dischargedAt && !!admittedAt && dischargedAt < admittedAt.slice(0, 16);

  const save = async () => {
    if (edit) {
      if (!draft.patient_id) return;
      const toDischarged = draft.status === "discharged";
      if (toDischarged && !draft.discharged_at) {
        push({ title: t("toasts.dateNeeded"), body: t("toasts.dateNeededBody"), tone: "warn" });
        return;
      }
      if (toDischarged && dischargeTooEarly(draft.admitted_at, draft.discharged_at)) {
        push({ title: t("toasts.checkDates"), body: t("toasts.tooEarly"), tone: "warn" });
        return;
      }

      const fields = {
        patient_id: draft.patient_id,
        doctor_id: draft.doctor_id || null,
        diagnosis: draft.diagnosis || null,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || null,
        admitted_at: fromLocalInput(draft.admitted_at),
      };

      // Discharging from the form: same path as the discharge button, so the
      // bed is released first. The rest of the edit rides along with it.
      if (toDischarged && edit.status !== "discharged") {
        const ok = await dischargeAdmission(edit, fromLocalInput(draft.discharged_at), fields);
        if (ok) setEdit(null);
        return;
      }

      const ok = await crud.update(edit.id, {
        ...fields,
        status: draft.status as AdmissionRow["status"],
        // Only a discharged admission carries a discharge date.
        discharged_at: toDischarged ? fromLocalInput(draft.discharged_at) : null,
      });
      if (ok) setEdit(null);
    } else {
      let patientId = draft.patient_id;
      let patientDisplayName = patientDetails?.patientName || patients.find(p => p.id === patientId)?.full_name;

      // Handle new patient registration if phone was entered but not registered yet
      if (!patientId && patientDetails?.isNew && patientDetails.newPatient) {
        const np = patientDetails.newPatient;
        if (!np.phone.trim()) {
          push({
            title: "Phone Number Required",
            body: "Please enter the patient's phone number.",
            tone: "warn",
          });
          return;
        }
        if (!np.full_name.trim()) {
          push({
            title: "Patient Name Required",
            body: "Please enter the patient's full name.",
            tone: "warn",
          });
          return;
        }

        try {
          const body: Partial<PatientRow> = {
            full_name: np.full_name.trim(),
            phone: np.phone.trim(),
            ...(np.gender ? { gender: np.gender as PatientRow["gender"] } : {}),
            ...(np.date_of_birth ? { date_of_birth: np.date_of_birth } : {}),
            ...(np.blood_group ? { blood_group: np.blood_group as PatientRow["blood_group"] } : {}),
          };
          const createdRes = await createPatient(body).unwrap();
          const newPatientRow = createdRes.data as PatientRow;
          patientId = newPatientRow.id;
          patientDisplayName = newPatientRow.full_name;
          void login.create(newPatientRow);
        } catch (cause) {
          const message = (cause as { data?: { error?: { message?: string } } })?.data?.error?.message;
          push({
            title: "Failed to create patient",
            body: message || "Could not save the new patient account.",
            tone: "bad",
          });
          return;
        }
      }

      if (!patientId) {
        push({
          title: "Patient Required",
          body: "Please enter patient phone number to select or register a patient.",
          tone: "warn",
        });
        return;
      }

      const ok = await admit({
        patient_id: patientId,
        doctor_id: draft.doctor_id || undefined,
        diagnosis: draft.diagnosis || undefined,
        priority: draft.priority as AdmissionRow["priority"],
        notes: draft.notes || undefined,
        // The form asks for this, so it has to be sent — dropping it here
        // silently overrode a backdated admission with the row's now()
        // default, and the desk had no way to tell.
        admitted_at: draft.admitted_at ? fromLocalInput(draft.admitted_at) : undefined,
        // Name only for the notice-board line — see AdmitInput.patientName.
        patientName: patientDisplayName,
        bed_id: draft.bed_id || undefined,
        cabin_id: draft.cabin_id || undefined,
      });
      if (ok) {
        setAdd(false);
        setPatientDetails(null);
      }
    }
  };

  /**
   * Two calls behind one confirmation, and the order is not a matter of taste:
   * release the bed FIRST, then flip the status.
   *
   * transfer_admission() refuses an admission that already has a
   * discharged_at (HF003 → 422, see docs/ward-admission-api.md), so setting
   * the status first makes the release fail every single time — the patient
   * reads as discharged while the bed stays occupied with an open bed_stays
   * row, which is the exact bug this ticket exists to close.
   *
   * If the release fails, the status is deliberately left alone: an admitted
   * patient still holding a bed is consistent, and the desk can retry. The
   * half-state to avoid is the other one.
   */
  const dischargeAdmission = async (
    a: AdmissionRow,
    dischargedAt: string,
    extra: Partial<AdmissionRow> = {},
  ) => {
    // Only an admission still holding a bed or cabin has one to release; an
    // unassigned one would make transfer_admission refuse an empty move.
    if (currentStay(a)) {
      try {
        await transferBed({ admission_id: a.id, bed_id: null, cabin_id: null }).unwrap();
      } catch {
        push({ title: t("toasts.releaseFailed"), body: t("toasts.releaseFailedBody"), tone: "bad" });
        return false;
      }
    }
    const ok = await crud.update(a.id, { ...extra, status: "discharged", discharged_at: dischargedAt });
    if (ok) {
      // The invoice is raised by the database as the status lands (0080).
      push({
        title: t("toasts.discharged"),
        body: billTotal(a) > 0
          ? t("toasts.dischargedInvoiced", { name: patientName(a) })
          : t("toasts.dischargedBody", { name: patientName(a) }),
        tone: "ok",
      });
      // A freed bed is the thing the next shift needs to know about.
      void notify({
        kind: "patient.discharged",
        title: t("notices.discharged", { name: patientName(a) }),
        body: currentStay(a) ? t("notices.nowFree", { place: locationLabel(a) }) : undefined,
        tone: "ok",
        entity_type: "admissions",
        entity_id: a.id,
      });
    } else {
      push({ title: t("toasts.halfDischarged"), body: t("toasts.halfDischargedBody"), tone: "warn" });
    }
    return ok;
  };

  const openDischarge = (a: AdmissionRow) => { setDischarge(a); setDischargeAt(now()); };

  const confirmDischarge = async () => {
    if (!discharge) return;
    if (!dischargeAt) {
      push({ title: t("toasts.dateNeeded"), body: t("toasts.dateNeededBody"), tone: "warn" });
      return;
    }
    if (dischargeTooEarly(toLocalInput(discharge.admitted_at), dischargeAt)) {
      push({ title: t("toasts.checkDate"), body: t("toasts.tooEarly"), tone: "warn" });
      return;
    }
    setDischarging(true);
    await dischargeAdmission(discharge, fromLocalInput(dischargeAt));
    setDischarging(false);
    setDischarge(null);
  };

  const openTransfer = (a: AdmissionRow) => { setTransferring(a); setTransferTarget({ bed_id: "", cabin_id: "" }); };
  const confirmTransfer = async () => {
    if (!transferring || (!transferTarget.bed_id && !transferTarget.cabin_id)) return;
    try {
      await transferBed({
        admission_id: transferring.id,
        bed_id: transferTarget.bed_id || null,
        cabin_id: transferTarget.cabin_id || null,
      }).unwrap();
      push({ title: t("toasts.transferred"), body: t("notices.moved", { name: patientName(transferring) }), tone: "ok" });
      void notify({
        kind: "patient.transferred",
        title: t("notices.moved", { name: patientName(transferring) }),
        body: t("notices.from", { place: locationLabel(transferring) }),
        tone: "info",
        entity_type: "admissions",
        entity_id: transferring.id,
      });
      setTransferring(null);
    } catch {
      push({ title: t("toasts.transferFailed"), body: t("toasts.transferFailedBody"), tone: "bad" });
    }
  };

  const columns: Column<AdmissionRow>[] = [
    {
      key: "patient", label: t("columns.patient"), sortable: true, accessor: a => a.patients?.full_name ?? "",
      render: a => {
        const age = ageFromDob(a.patients?.date_of_birth ?? null);
        return (
          <div>
            <p className="font-semibold text-primary">{a.patients?.full_name ?? t("unknownPatient")}</p>
            <p className="text-[11px] text-muted-foreground">
              {age !== null ? `${t("age", { age })} · ` : ""}{a.patients?.gender ?? ""}{a.patients?.phone ? ` · ${a.patients.phone}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "location", label: t("columns.location"), sortable: true, accessor: a => locationLabel(a),
      render: a => <span className="font-semibold">{locationLabel(a)}</span>,
    },
    { key: "doctor", label: t("columns.doctor"), sortable: true, accessor: a => a.doctors?.name ?? "", render: a => <span className="text-sm">{a.doctors?.name ?? "—"}</span> },
    { key: "diagnosis", label: t("columns.diagnosis"), render: a => <span className="text-sm">{a.diagnosis || "—"}</span> },
    {
      key: "priority", label: t("columns.priority"), sortable: true, accessor: a => a.priority,
      render: a => <Pill tone={priorityTone[a.priority]}>{priorityLabel(a.priority)}</Pill>,
    },
    {
      key: "status", label: t("columns.status"), sortable: true, accessor: a => a.status,
      render: a => <Pill tone={statusTone(a.status)}>{statusLabel(a.status)}</Pill>,
    },
    {
      key: "admitted_at", label: t("columns.admitted"), sortable: true, accessor: a => a.admitted_at,
      render: a => <span className="text-xs text-muted-foreground">{formatDateTime(a.admitted_at)}</span>,
    },
    {
      key: "bill", label: t("columns.bill"), sortable: true, accessor: billTotal,
      render: a => {
        const live = computeAdmissionLiveBill(a);
        const invoice = invoiceOf(a);
        const note = invoice?.paid_at
          ? t("billNote.paid")
          : a.status === "discharged"
          ? `${t("billNote.final")} (${live.days}d)`
          : `Live (${live.days}d so far)`;
        return (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setBillId(a.id); }}
            className="text-left group cursor-pointer"
            title="Click to view up-to-date live bill breakdown"
          >
            <p className="font-semibold text-primary group-hover:underline">{formatCurrency(billTotal(a))}</p>
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </button>
        );
      },
    },
  ];

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={BedDouble} label={t("kpis.active")} value={String(active.length)} tone="primary" />
        <Kpi icon={Activity} label={t("kpis.critical")} value={String(critical)} tone="destructive" />
        <Kpi icon={Stethoscope} label={t("kpis.inSurgery")} value={String(byStatus("in_surgery"))} tone="accent" />
        <Kpi icon={UserPlus} label={t("kpis.today")} value={String(todaysAdmits)} tone="chip" />
      </div>

      {/* Occupancy by clinical status — the old strip grouped by ward name,
          which no longer lives on the admission row itself (see
          docs/ward-admission-api.md on why location moved to bed_stays).
          Grouping by status keeps the same at-a-glance purpose without a
          second join the frontend doesn't need for anything else. */}
      <Card className="p-5 mb-6">
        <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-3 uppercase">{t("activeByStatus")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EDITABLE_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-2 text-left transition ${statusFilter === s ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"}`}>
              <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{statusLabel(s)}</p>
              <p className="font-display text-xl text-primary">{byStatus(s)}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="p-5">
        <SectionTitle title={t("register")} />
        <Toolbar
          search={search} onSearch={setSearch}
          onAdd={openAdd} addLabel={t("admitPatient")}
          onExport={() => exportCSV(rows as unknown as Record<string, unknown>[], "admissions.csv")}
          bulkCount={selected.length}
          onBulkDelete={() => { crud.bulkRemove(selected); setSelected([]); }}
          filters={
            <Chips
              value={statusFilter}
              onChange={v => setStatusFilter(v)}
              options={[{ value: "all", label: t("all") }, ...STATUSES.map(s => ({ value: s, label: statusLabel(s) }))]}
            />
          }
        />
        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">{t("loadFailed")}</p>
            <button type="button" onClick={() => crud.refetch()} className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">{t("tryAgain")}</button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            selected={selected}
            onSelect={setSelected}
            onRow={openEdit}
            empty={t("empty")}
            actions={(row) => (
              <RowActions
                onEdit={() => openEdit(row)}
                onDelete={() => setDel(row.id)}
                extra={
                  <>
                    <button onClick={() => setBillId(row.id)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={invoiceOf(row) ? t("invoice") : t("bill")}>
                      <FileText className="h-4 w-4" />
                    </button>
                    {row.status !== "discharged" && (
                      <>
                        <button onClick={() => openTransfer(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={t("transfer")}>
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => openDischarge(row)} className="p-1.5 rounded-lg hover:bg-muted text-primary" title={t("discharge")}>
                          <LogOut className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                }
              />
            )}
          />
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={add || !!edit}
        onClose={() => { setAdd(false); setEdit(null); }}
        title={edit ? t("editTitle") : t("admitTitle")}
        size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => { setAdd(false); setEdit(null); }}>{tc("cancel")}</Btn>
          <Btn onClick={save}>{edit ? t("saveChanges") : t("admitTitle")}</Btn>
        </>}
      >
        <div className="grid sm:grid-cols-2 gap-x-5">
          {!edit ? (
            <div className="sm:col-span-2 mb-3">
              <PatientByPhoneField
                name="patient_id"
                autoFocus
                onPatientChange={handlePatientChange}
              />
            </div>
          ) : (
            <div className="sm:col-span-2 mb-4 p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Patient</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{edit.patients?.full_name}</div>
                <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                  {edit.patients?.mrn && <span>MRN: {edit.patients.mrn}</span>}
                  {edit.patients?.phone && <span>• {edit.patients.phone}</span>}
                </div>
              </div>
              <Pill tone="info">{statusLabel(edit.status)}</Pill>
            </div>
          )}
          <Field label={t("fields.doctor")}>
            <Select value={draft.doctor_id} onChange={e => setDraft(d => ({ ...d, doctor_id: e.target.value }))}>
              {doctorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label={t("columns.diagnosis")}><Input value={draft.diagnosis} onChange={e => setDraft(d => ({ ...d, diagnosis: e.target.value }))} placeholder={t("fields.diagnosisPlaceholder")} /></Field>
          <Field label={t("columns.priority")}>
            <Select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
            </Select>
          </Field>
          {!edit ? (
            <>
              <Field label={t("fields.assignBed")} hint={t("fields.assignHint")}>
                <Select value={draft.bed_id} onChange={e => setDraft(d => ({ ...d, bed_id: e.target.value, cabin_id: e.target.value ? "" : d.cabin_id }))}>
                  <option value="">{t("noBed")}</option>
                  {availableBeds.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? t("ward")} · {t("place.bed", { number: String(b.number) })}</option>)}
                </Select>
              </Field>
              <Field label={t("fields.assignCabin")}>
                <Select value={draft.cabin_id} onChange={e => setDraft(d => ({ ...d, cabin_id: e.target.value, bed_id: e.target.value ? "" : d.bed_id }))}>
                  <option value="">{t("noCabin")}</option>
                  {availableCabins.map(c => <option key={c.id} value={c.id}>{t("place.cabin", { number: String(c.number) })} ({c.category})</option>)}
                </Select>
              </Field>
            </>
          ) : (
            <Field
              label={t("columns.status")}
              hint={edit.status !== "discharged" && draft.status === "discharged"
                ? currentStay(edit)
                  ? t("fields.releaseHint", { place: locationLabel(edit) })
                  : t("fields.releaseHintNone")
                : undefined}
            >
              <Select
                value={draft.status}
                onChange={e => setDraft(d => ({
                  ...d,
                  status: e.target.value,
                  // Choosing Discharged starts the date at now; leaving it clears it.
                  discharged_at: e.target.value === "discharged" ? (d.discharged_at || now()) : "",
                }))}
              >
                {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </Select>
            </Field>
          )}
          <Field label={t("fields.admittedAt")}><DateTimeLocalInput value={draft.admitted_at} onChange={admitted_at => setDraft(d => ({ ...d, admitted_at }))} /></Field>
          {edit && draft.status === "discharged" && (
            <Field label={t("fields.dischargedAt")} required>
              <DateTimeLocalInput
                value={draft.discharged_at}
                min={draft.admitted_at}
                onChange={discharged_at => setDraft(d => ({ ...d, discharged_at }))}
              />
            </Field>
          )}
        </div>
        <Field label={t("fields.notes")}><TextArea rows={3} value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder={t("fields.notesPlaceholder")} /></Field>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && crud.remove(del)}
        title={t("removeTitle")}
        description={t("removeBody")}
      />

      <Modal
        open={!!discharge}
        onClose={() => !discharging && setDischarge(null)}
        title={discharge?.patients?.full_name
          ? t("dischargeTitle", { name: discharge.patients.full_name })
          : t("dischargeTitleAnon")}
        size="sm"
        footer={<>
          <Btn variant="outline" onClick={() => setDischarge(null)} disabled={discharging}>{tc("cancel")}</Btn>
          <Btn onClick={confirmDischarge} disabled={discharging || !dischargeAt}>
            {discharging ? t("discharging") : t("confirm")}
          </Btn>
        </>}
      >
        {discharge && (
          <>
            <Field label={t("fields.dischargeWhen")} required>
              <DateTimeLocalInput
                value={dischargeAt}
                min={toLocalInput(discharge.admitted_at)}
                onChange={setDischargeAt}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              {currentStay(discharge)
                ? t("willRelease", { place: locationLabel(discharge) })
                : t("nothingToRelease")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {billTotal(discharge) > 0
                ? t.rich("willInvoice", {
                    amount: formatCurrency(billTotal(discharge)),
                    b: chunks => <b className="text-foreground">{chunks}</b>,
                  })
                : t("noInvoice")}
            </p>
          </>
        )}
      </Modal>

      {/* Transfer modal */}
      <Modal
        open={!!transferring}
        onClose={() => setTransferring(null)}
        title={t("transferTitle", { name: transferring?.patients?.full_name ?? "" })}
        footer={<>
          <Btn variant="outline" onClick={() => setTransferring(null)}>{tc("cancel")}</Btn>
          <Btn onClick={confirmTransfer} disabled={!transferTarget.bed_id && !transferTarget.cabin_id}>{t("movePatient")}</Btn>
        </>}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {t.rich("currentlyIn", {
            place: transferring ? locationLabel(transferring) : "",
            b: chunks => <b className="text-foreground">{chunks}</b>,
          })}
        </p>
        <Field label={t("fields.moveToBed")}>
          <Select value={transferTarget.bed_id} onChange={e => setTransferTarget({ bed_id: e.target.value, cabin_id: e.target.value ? "" : transferTarget.cabin_id })}>
            <option value="">{t("noBed")}</option>
            {availableBeds.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? t("ward")} · {t("place.bed", { number: String(b.number) })}</option>)}
          </Select>
        </Field>
        <Field label={t("fields.moveToCabin")}>
          <Select value={transferTarget.cabin_id} onChange={e => setTransferTarget({ cabin_id: e.target.value, bed_id: e.target.value ? "" : transferTarget.bed_id })}>
            <option value="">{t("noCabin")}</option>
            {availableCabins.map(c => <option key={c.id} value={c.id}>{t("place.cabin", { number: String(c.number) })} ({c.category})</option>)}
          </Select>
        </Field>
      </Modal>

      {/* Official IPD Inpatient Hospital Invoice Modal */}
      {billFor && typeof document !== "undefined" && createPortal(
        <div
          className="sale-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none"
          onClick={() => setBillId(null)}
        >
          <div
            className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:overflow-visible print:bg-white print:p-0 print:m-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Hidden in Print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary leading-tight">
                    IPD Inpatient Hospital Invoice · {patientName(billFor)}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Ref: {invoiceOf(billFor)?.reference || `ADM-${billFor.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillId(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label={tc("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 print:m-0">
              {(() => {
                const a = billFor;
                const inv = invoiceOf(a);
                const live = computeAdmissionLiveBill(a);
                const lines = (inv?.paid_at && inv.line_items?.length) ? inv.line_items : live.lines;
                const total = (inv?.paid_at) ? Number(inv.amount) : live.total;
                const age = ageFromDob(a.patients?.date_of_birth ?? null);
                const lastStay = a.bed_stays[a.bed_stays.length - 1];
                const location = currentStay(a) ? locationLabel(a) : placeLabel(placeOf(lastStay));
                const reference = inv?.reference || `ADM-${a.id.slice(0, 8).toUpperCase()}`;
                const isSettled = Boolean(inv?.paid_at);

                const hospitalNameStr = hospitalProfile?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
                const hospitalTagline = hospitalProfile?.tagline?.trim() || "Inpatient Department (IPD) · Admission & Bed Services";
                const hospitalAddress = [
                  hospitalProfile?.address?.trim(),
                  hospitalProfile?.location?.trim(),
                ].filter(Boolean).join(" · ");
                const hospitalPhone = hospitalProfile?.contact_phone?.trim() || "+880 1700-000000";
                const hospitalEmail = hospitalProfile?.contact_email?.trim() || "care@healthflowbd.com";
                const hospitalLogo = (hospitalProfile?.logo_url ? mediaUrl(hospitalProfile.logo_url) : null) || BRAND_INFO.logoMark;

                return (
                  <div id="printable-ipd-invoice" className="bg-card text-foreground p-6 sm:p-7 rounded-2xl border border-border/70 shadow-xs space-y-6 text-xs print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
                    {/* Header: Hospital Branding & Invoice Identification */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-border/70 gap-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={hospitalLogo}
                          alt={hospitalNameStr}
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-auto max-w-[140px] shrink-0 object-contain rounded-lg"
                        />
                        <div>
                          <h2 className="text-lg font-bold text-primary tracking-tight">{hospitalNameStr}</h2>
                          <p className="text-[11px] text-muted-foreground font-medium">{hospitalTagline}</p>
                          {hospitalAddress ? (
                            <p className="text-[11px] text-muted-foreground/90 font-medium mt-0.5">{hospitalAddress}</p>
                          ) : null}
                          <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">Helpline: {hospitalPhone} · {hospitalEmail}</p>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
                          {live.isDismissed ? "IPD DISCHARGE INVOICE" : "IPD LIVE PATIENT BILL"}
                        </div>
                        <div className="mt-1 font-mono font-bold text-primary text-sm tracking-wide">
                          #{reference}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Generated: {formatDateTime(new Date().toISOString())}
                        </div>
                        <div className="mt-2">
                          {live.isDismissed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              {isSettled ? "SETTLED & PAID" : "DISCHARGED · FINAL"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              ACTIVE ADMISSION · LIVE RUNNING CHARGES
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Patient & Admission Grid Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
                      {/* Left: Patient Details */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          BILLED PATIENT (INPATIENT):
                        </div>
                        <div className="text-base font-bold text-primary">
                          {a.patients?.full_name ?? "—"}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-foreground/80 pt-1">
                          <div>
                            <span className="text-muted-foreground">MRN: </span>
                            <span className="font-mono font-bold text-foreground">#{a.patients?.mrn ?? "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Phone: </span>
                            <span className="font-medium text-foreground">{a.patients?.phone ?? "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Age / Gender: </span>
                            <span className="font-medium text-foreground">
                              {age !== null ? `${age} Yrs` : "—"} · {a.patients?.gender ? a.patients.gender.charAt(0).toUpperCase() + a.patients.gender.slice(1) : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Blood Group: </span>
                            <span className="font-medium text-foreground font-mono">{a.patients?.blood_group ? a.patients.blood_group.toUpperCase().replace("_", "") : "—"}</span>
                          </div>
                        </div>
                        {a.diagnosis && (
                          <div className="pt-1.5 border-t border-border/50 text-[11px]">
                            <span className="text-muted-foreground font-semibold">Provisional Diagnosis: </span>
                            <span className="text-foreground font-medium">{a.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Stay Timeline & Placement */}
                      <div className="space-y-1.5 md:border-l md:border-border/50 md:pl-5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          ADMISSION & STAY DETAILS:
                        </div>
                        <div className="space-y-1 pt-1 text-foreground/80">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Admission Date:</span>
                            <span className="font-semibold text-foreground font-mono">{formatDateTime(a.admitted_at)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{live.isDismissed ? "Dismissed Date:" : "Calculated Through:"}</span>
                            <span className="font-semibold text-foreground font-mono">
                              {live.isDismissed ? formatDateTime(a.discharged_at || a.admitted_at) : `${formatDateTime(new Date().toISOString())} (Current Date)`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Stay Duration:</span>
                            <span className="font-bold text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-md">
                              {live.days} Day{live.days > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Assigned Location:</span>
                            <span className="font-semibold text-foreground">{location}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Attending Doctor:</span>
                            <span className="font-semibold text-foreground">{a.doctors?.name ? `${a.doctors.name} (${a.doctors.specialty || "Physician"})` : "Hospital Medical Team"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Itemized Table of Charges */}
                    <div className="border border-border/80 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/60 border-b border-border/80 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                            <th className="py-2.5 px-3.5">Particulars / Inpatient Service Description</th>
                            <th className="py-2.5 px-3.5 text-center w-28">Stay Duration</th>
                            <th className="py-2.5 px-3.5 text-right w-32">Daily Unit Rate</th>
                            <th className="py-2.5 px-3.5 text-right w-32">Total (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {lines.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-3.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="py-3 px-3.5">
                                <div className="font-semibold text-foreground text-xs">{item.description}</div>
                                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {live.isDismissed
                                    ? `Billed from admission date (${formatDate(a.admitted_at)}) to discharge date (${formatDate(a.discharged_at || a.admitted_at)})`
                                    : `Billed from admission date (${formatDate(a.admitted_at)}) to current date (${formatDate(new Date().toISOString())})`}
                                </div>
                              </td>
                              <td className="py-3 px-3.5 text-center font-semibold font-mono text-foreground">
                                {item.quantity} {item.quantity === 1 ? "Day" : "Days"}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono text-muted-foreground">
                                {formatCurrency(Number(item.rate))} / day
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-bold text-primary">
                                {formatCurrency(Number(item.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculation Summary Box (Right-aligned) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-1">
                      <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
                        <div className="font-semibold text-foreground">Billing Duration Notice:</div>
                        <p>
                          {live.isDismissed
                            ? `Final discharge bill calculated for ${live.days} day(s) from admission date (${formatDate(a.admitted_at)}) till dismissed date (${formatDate(a.discharged_at || a.admitted_at)}).`
                            : `Live ongoing bill calculated for ${live.days} day(s) from admission date (${formatDate(a.admitted_at)}) till current date (${formatDate(new Date().toISOString())}).`}
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Daily room charges and nursing care charges accrue per calendar day occupied.
                        </p>
                      </div>

                      <div className="w-full sm:w-80 p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Stay & Bed Subtotal:</span>
                          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount / Waiver:</span>
                          <span className="font-medium text-foreground">{formatCurrency(0)}</span>
                        </div>
                        <div className="border-t border-border/70 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                          <span>Grand Total:</span>
                          <span className="font-mono text-lg">{formatCurrency(total)}</span>
                        </div>
                        <div className="border-t border-border/50 pt-2 flex justify-between items-center text-[11px] font-sans">
                          <span className="text-muted-foreground font-semibold">Payment Status:</span>
                          <span className={`font-bold uppercase ${isSettled ? "text-emerald-600" : live.isDismissed ? "text-amber-600" : "text-blue-600"}`}>
                            {isSettled ? "Settled & Paid" : live.isDismissed ? "Due upon discharge" : "Accruing (Live)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Official Terms & Authorized Signature */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/80">
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Terms & Instructions:</p>
                        <p>1. This is an official computer-generated inpatient bill from {hospitalNameStr}.</p>
                        <p>2. Final billing settlement and discharge summary clearance are completed at the billing cash counter.</p>
                        <p>3. Wishing the patient a speedy and complete recovery.</p>
                      </div>

                      <div className="sm:text-right space-y-6">
                        <div className="text-[11px] text-muted-foreground">Authorized Hospital Accounts</div>
                        <div className="border-b border-border/80 w-44 ml-auto" />
                        <div className="text-xs font-semibold text-foreground">
                          {hospitalNameStr} Accounts & Billing Desk
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer (Hidden in Print) */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20 print:hidden">
              <Btn variant="outline" onClick={() => setBillId(null)}>{tc("close")}</Btn>
              <Btn variant="outline" onClick={handleCopyReference}>
                {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy Reference"}
              </Btn>
              <Btn onClick={handlePrintModalInvoice}>
                <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
          {summaryAdmission && (
        <DischargeSummaryModal
          admission={summaryAdmission}
          onClose={() => setSummaryAdmission(null)}
        />
      )}
    </AdminLayout>
  );
};

export default Admissions;
