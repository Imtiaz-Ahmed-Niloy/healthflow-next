"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, Chips, ConfirmDialog, DataTable, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useFormatters } from "@/lib/appSettings";
import { useTransferBedMutation } from "@/redux/api/bedTransfers";
import { useCreateResourceMutation } from "@/redux/api/createResourceApi";
import {
  admissionsApi, doctorsApi, patientsApi,
  type WardRow, type BedRow, type CabinRow, type AdmissionRow,
} from "@/redux/api/resources";
import {
  Bed, Home, Wifi, Tv, Wind, Coffee, Bath, Users, Pencil, ArrowRightLeft, LogOut,
  Search, LayoutGrid, Printer, Clock, Sparkles, Activity, AlertTriangle, Stethoscope,
  Eye, CheckCircle2, X,
} from "lucide-react";
import { printWardCensus } from "@/lib/wardCensusPrint";
import { BRAND_INFO } from "@/constants/brand";
import { mediaUrl } from "@/lib/media";

/**
 * HF-37 frontend wiring. Real tables now: wards, beds, cabins, plus
 * admissions (read, to resolve who's in a bed) and patients/doctors (for the
 * admit form). See docs/ward-admission-api.md.
 *
 * The one behavioural change beyond a plain data swap: clicking a bed or
 * cabin to admit, move, or discharge someone now goes through
 * /api/v1/bed-transfers (useAdmitPatient / useTransferBedMutation) instead of
 * writing a status/patient field directly. beds.patient / cabins.patient /
 * cabins.attendant still exist in the schema but are transitional — nothing
 * here reads or writes them; occupant identity comes from
 * bed_stays -> admissions -> patients instead.
 *
 * What's still a direct field write, deliberately: a bed's cleaning ->
 * available flip, and a cabin's cleaning/maintenance/reserved/available
 * status — housekeeping metadata with no patient identity at stake, not an
 * occupancy event. "occupied" is never set this way; only
 * transfer_admission() (via bed-transfers) sets it, so it always corresponds
 * to a real bed_stays row.
 */

const WARD_CATEGORIES = ["general", "semi_private", "icu", "maternity", "pediatric"] as const;
const wardCategoryTone: Record<string, string> = {
  general: "bg-primary text-primary-foreground",
  semi_private: "bg-primary-glow text-primary-foreground",
  icu: "bg-destructive text-destructive-foreground",
  maternity: "bg-accent text-accent-foreground",
  pediatric: "bg-secondary text-secondary-foreground",
};

const BED_TYPES = ["general", "icu", "cabin"] as const;

const BED_STATUSES = ["available", "occupied", "cleaning"] as const;

const CABIN_CATEGORIES = ["standard", "deluxe", "premium", "suite"] as const;

/** Beds and cabins share the words for these, so one list labels both. */
const CABIN_STATUSES = ["available", "occupied", "reserved", "cleaning", "maintenance"] as const;

/** Never "occupied" here — that only ever comes from a real bed_stays row. */
const CABIN_MANUAL_STATUSES = CABIN_STATUSES.filter(s => s !== "occupied");

const cabinStatusBg: Record<string, string> = {
  available: "bg-accent/40 text-accent-foreground",
  occupied: "bg-destructive/10 text-destructive",
  reserved: "bg-blue-50 text-blue-700",
  cleaning: "bg-yellow-50 text-yellow-800",
  maintenance: "bg-orange-50 text-orange-700",
};
const AMENITY_LIST = ["WiFi", "TV", "AC", "Mini Fridge", "Attached Bath", "Sofa Bed"];
const AMENITY_ICON: Record<string, typeof Wifi> = { WiFi: Wifi, TV: Tv, AC: Wind, "Mini Fridge": Coffee, "Attached Bath": Bath, "Sofa Bed": Users };
const WARD_FACILITY_LIST = ["AC", "WiFi", "TV", "Attached Bath", "Shared Bath", "Oxygen Supply", "Ventilator", "Nurse Call", "Cardiac Monitor", "Visitor Chair", "Locker", "Meals Included"];

/**
 * Amenities and facilities are stored as these English words, so the words
 * stay as they are in the database and only their label is translated. One
 * saved before this list existed shows as it was typed.
 */
const FEATURE_KEYS = {
  WiFi: "wifi", TV: "tv", AC: "ac", "Mini Fridge": "miniFridge", "Attached Bath": "attachedBath",
  "Sofa Bed": "sofaBed", "Shared Bath": "sharedBath", "Oxygen Supply": "oxygen", Ventilator: "ventilator",
  "Nurse Call": "nurseCall", "Cardiac Monitor": "cardiacMonitor", "Visitor Chair": "visitorChair",
  Locker: "locker", "Meals Included": "meals",
} as const;
const isFeature = (value: string): value is keyof typeof FEATURE_KEYS => value in FEATURE_KEYS;

const ageFromDob = (dob: string | null | undefined) => {
  if (!dob) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
};

const computeStayDays = (admittedAt: string, dischargedAt?: string | null) => {
  const start = new Date(admittedAt).getTime();
  const end = dischargedAt ? new Date(dischargedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

type AdmitTarget = { bed_id?: string; cabin_id?: string; label: string };
type AdmitDraft = { patient_id: string; doctor_id: string; diagnosis: string; priority: string; notes: string };
const emptyAdmitDraft: AdmitDraft = { patient_id: "", doctor_id: "", diagnosis: "", priority: "routine", notes: "" };

const Wards = () => {
  const t = useTranslations("admin.wards");
  // Admit, transfer and discharge read the same here as on the Admissions page.
  const ta = useTranslations("admin.admissions");
  const tc = useTranslations("common");
  const wardCategoryLabel = (v: string) =>
    (WARD_CATEGORIES as readonly string[]).includes(v) ? t(`wardCategories.${v as (typeof WARD_CATEGORIES)[number]}`) : v;
  const cabinCategoryLabel = (v: string) =>
    (CABIN_CATEGORIES as readonly string[]).includes(v) ? t(`cabinCategories.${v as (typeof CABIN_CATEGORIES)[number]}`) : v;
  const statusLabel = (v: string) =>
    (CABIN_STATUSES as readonly string[]).includes(v) ? t(`statuses.${v as (typeof CABIN_STATUSES)[number]}`) : v;
  const bedTypeLabel = (v: string) =>
    (BED_TYPES as readonly string[]).includes(v) ? t(`bedTypes.${v as (typeof BED_TYPES)[number]}`) : v;
  const featureLabel = (v: string) => isFeature(v) ? t(`features.${FEATURE_KEYS[v]}`) : v;
  const bedName = (number: string | number) => ta("place.bed", { number: String(number) });
  const cabinName = (number: string | number) => ta("place.cabin", { number: String(number) });
  const nameOf = (a: AdmissionRow | null) => a?.patients?.full_name ?? ta("thePatient");
  const ageLine = (a: AdmissionRow) => {
    const age = ageFromDob(a.patients?.date_of_birth);
    return age !== null ? `${ta("age", { age })} · ` : "";
  };
  const bedFilters = [{ value: "all", label: t("all") }, ...BED_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))];
  const cabinFilters = [{ value: "all", label: t("all") }, ...CABIN_STATUSES.map(s => ({ value: s, label: statusLabel(s) }))];

  // Money in the currency set in global settings
  const { formatCurrency, currencySymbol } = useFormatters();
  const wardsCrud = useResourceCrud<WardRow>("wards");
  const bedsCrud = useResourceCrud<BedRow>("beds");
  const cabinsCrud = useResourceCrud<CabinRow>("cabins");
  const [createBed] = useCreateResourceMutation();
  const [createCabin] = useCreateResourceMutation();
  const { push, notify } = useNotifications();
  const { admit } = useAdmitPatient();
  const [transferBed] = useTransferBedMutation();
  const [updateAdmission] = admissionsApi.useUpdate();

  // Search & View Mode states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");

  // Hospital profile for census reports & branding
  const [hospitalProfile, setHospitalProfile] = useState<{
    name?: string;
    tagline?: string;
    logo_url?: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    location?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/v1/hospital/profile");
        const body = await res.json().catch(() => null);
        if (!cancelled && res.ok && body?.data) {
          setHospitalProfile(body.data);
        }
      } catch {}
    };
    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Read admissions to resolve occupants
  const { data: admissionsData } = admissionsApi.useList({ limit: 100 });
  const admissions = useMemo(() => admissionsData?.data ?? [], [admissionsData]);
  const occupantByBed = useMemo(() => {
    const map = new Map<string, AdmissionRow>();
    for (const a of admissions) {
      const stay = a.bed_stays.find(s => s.ended_at === null);
      if (stay?.bed_id) map.set(stay.bed_id, a);
    }
    return map;
  }, [admissions]);
  const occupantByCabin = useMemo(() => {
    const map = new Map<string, AdmissionRow>();
    for (const a of admissions) {
      const stay = a.bed_stays.find(s => s.ended_at === null);
      if (stay?.cabin_id) map.set(stay.cabin_id, a);
    }
    return map;
  }, [admissions]);

  const { data: patientsData, isLoading: patientsLoading } = patientsApi.useList({ limit: 100 });
  const patients = useMemo(() => patientsData?.data ?? [], [patientsData]);
  const patientOptions = useMemo(() => [
    { value: "", label: patientsLoading ? ta("loadingPatients") : ta("selectPatient") },
    ...patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.mrn})` })),
  ], [patients, patientsLoading, ta]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? ta("loadingDoctors") : ta("notAssigned") },
    ...doctors.map(d => ({ value: d.id, label: d.specialty ? `${d.name} · ${d.specialty}` : d.name })),
  ], [doctors, doctorsLoading, ta]);

  // ---- ward pricing/facilities ----
  const [editWard, setEditWard] = useState<WardRow | null>(null);
  const [addWard, setAddWard] = useState(false);
  const [delWard, setDelWard] = useState<string | null>(null);
  const [facDraft, setFacDraft] = useState<string[]>([]);
  const openEditWard = (w: WardRow) => { setEditWard(w); setFacDraft(w.facilities); };
  const openAddWard = () => { setAddWard(true); setFacDraft([]); };
  const toggleFac = (f: string) => setFacDraft(d => d.includes(f) ? d.filter(x => x !== f) : [...d, f]);

  const saveWard = async (fd: FormData) => {
    const data = {
      name: String(fd.get("name")),
      daily_rate: Number(fd.get("daily_rate")) || 0,
      facilities: facDraft,
      notes: String(fd.get("notes") || "") || null,
    };
    if (editWard) {
      const ok = await wardsCrud.update(editWard.id, data);
      if (ok) setEditWard(null);
    } else {
      const created = await wardsCrud.create(data as never);
      if (created) {
        setAddWard(false);
        const totalBeds = Number(fd.get("total_beds")) || 0;
        if (totalBeds > 0) await createBedsForWard(created.id, totalBeds);
      }
    }
  };

  const createBedsForWard = async (wardId: string, count: number) => {
    let ok = 0;
    for (let n = 1; n <= count; n++) {
      try {
        await createBed({ resource: "beds", body: { ward_id: wardId, number: String(n) } }).unwrap();
        ok++;
      } catch {
        // One bed failing shouldn't stop the rest
      }
    }
    if (ok === 0) push({ title: t("bedsCreateFailed"), tone: "bad" });
    else push({ title: t("bedsCreated", { count: ok }), tone: ok === count ? "ok" : "warn" });
  };

  // ---- beds: floor map + metadata ----
  const [bedFilter, setBedFilter] = useState<string>("all");
  const [addBed, setAddBed] = useState(false);
  const [editBedMeta, setEditBedMeta] = useState<BedRow | null>(null);
  const [bedDetail, setBedDetail] = useState<BedRow | null>(null);
  const [delBed, setDelBed] = useState<string | null>(null);

  const saveBedMeta = async (fd: FormData) => {
    const data = {
      ward_id: String(fd.get("ward_id")),
      number: String(fd.get("number")),
      type: fd.get("type") as BedRow["type"],
    };
    if (editBedMeta) {
      const ok = await bedsCrud.update(editBedMeta.id, data);
      if (ok) setEditBedMeta(null);
    } else {
      const created = await bedsCrud.create(data as never);
      if (created) setAddBed(false);
    }
  };

  const markBedAvailable = async (bed: BedRow) => {
    const ok = await bedsCrud.update(bed.id, { status: "available" });
    if (ok) setBedDetail(null);
  };

  // ---- cabins: floor cards + metadata ----
  const [cabFilter, setCabFilter] = useState<string>("all");
  const [addCabin, setAddCabin] = useState(false);
  const [editCabinMeta, setEditCabinMeta] = useState<CabinRow | null>(null);
  const [cabinDetail, setCabinDetail] = useState<CabinRow | null>(null);
  const [delCabin, setDelCabin] = useState<string | null>(null);
  const [amenityDraft, setAmenityDraft] = useState<string[]>([]);
  const openEditCabinMeta = (c: CabinRow) => { setEditCabinMeta(c); setAmenityDraft(c.amenities); };
  const openAddCabin = () => { setAddCabin(true); setAmenityDraft([]); };
  const toggleAmenity = (a: string) => setAmenityDraft(d => d.includes(a) ? d.filter(x => x !== a) : [...d, a]);

  const saveCabinMeta = async (fd: FormData) => {
    const name = String(fd.get("number"));
    const daily_rate = Number(fd.get("daily_rate")) || 0;
    const notes = String(fd.get("notes") || "") || null;

    if (editCabinMeta) {
      const ok = await cabinsCrud.update(editCabinMeta.id, { number: name, daily_rate, amenities: amenityDraft, notes });
      if (ok) setEditCabinMeta(null);
      return;
    }

    const totalCabins = Number(fd.get("total_cabins")) || 0;
    if (totalCabins > 1) {
      setAddCabin(false);
      await createCabinsBatch(name, totalCabins, daily_rate, notes);
      return;
    }

    const created = await cabinsCrud.create({ number: name, daily_rate, amenities: amenityDraft, notes, floor: "1st Floor" } as never);
    if (created) setAddCabin(false);
  };

  const createCabinsBatch = async (name: string, count: number, daily_rate: number, notes: string | null) => {
    let ok = 0;
    for (let n = 1; n <= count; n++) {
      try {
        await createCabin({ resource: "cabins", body: { number: `${name} ${n}`, daily_rate, amenities: amenityDraft, notes, floor: "1st Floor" } }).unwrap();
        ok++;
      } catch {
        // Continue if one fails
      }
    }
    if (ok === 0) push({ title: t("cabinsCreateFailed"), tone: "bad" });
    else push({ title: t("cabinsCreated", { count: ok }), tone: ok === count ? "ok" : "warn" });
  };

  const setCabinManualStatus = async (cabin: CabinRow, status: string) => {
    const ok = await cabinsCrud.update(cabin.id, { status: status as CabinRow["status"] });
    if (ok) setCabinDetail(null);
  };

  // ---- admit / transfer / discharge — shared between beds and cabins ----
  const [admitTarget, setAdmitTarget] = useState<AdmitTarget | null>(null);
  const [admitDraft, setAdmitDraft] = useState<AdmitDraft>(emptyAdmitDraft);
  const openAdmit = (target: AdmitTarget) => {
    setBedDetail(null); setCabinDetail(null);
    setAdmitTarget(target); setAdmitDraft(emptyAdmitDraft);
  };
  const submitAdmit = async () => {
    if (!admitTarget || !admitDraft.patient_id) return;
    const ok = await admit({
      patient_id: admitDraft.patient_id,
      doctor_id: admitDraft.doctor_id || undefined,
      diagnosis: admitDraft.diagnosis || undefined,
      priority: admitDraft.priority as AdmissionRow["priority"],
      notes: admitDraft.notes || undefined,
      patientName: patients.find(p => p.id === admitDraft.patient_id)?.full_name,
      bed_id: admitTarget.bed_id,
      cabin_id: admitTarget.cabin_id,
    });
    if (ok) setAdmitTarget(null);
  };

  const [transferTarget, setTransferTarget] = useState<AdmissionRow | null>(null);
  const [transferChoice, setTransferChoice] = useState({ bed_id: "", cabin_id: "" });
  const openTransfer = (a: AdmissionRow) => {
    setBedDetail(null); setCabinDetail(null);
    setTransferTarget(a); setTransferChoice({ bed_id: "", cabin_id: "" });
  };
  const submitTransfer = async () => {
    if (!transferTarget || (!transferChoice.bed_id && !transferChoice.cabin_id)) return;
    try {
      await transferBed({
        admission_id: transferTarget.id,
        bed_id: transferChoice.bed_id || null,
        cabin_id: transferChoice.cabin_id || null,
      }).unwrap();
      push({ title: ta("toasts.transferred"), body: ta("notices.moved", { name: nameOf(transferTarget) }), tone: "ok" });
      void notify({
        kind: "patient.transferred",
        title: ta("notices.moved", { name: nameOf(transferTarget) }),
        tone: "info",
        entity_type: "admissions",
        entity_id: transferTarget.id,
      });
      setTransferTarget(null);
    } catch {
      push({ title: ta("toasts.transferFailed"), body: ta("toasts.transferFailedBody"), tone: "bad" });
    }
  };

  const [dischargeTarget, setDischargeTarget] = useState<AdmissionRow | null>(null);
  const openDischarge = (a: AdmissionRow) => { setBedDetail(null); setCabinDetail(null); setDischargeTarget(a); };
  const confirmDischarge = async () => {
    if (!dischargeTarget) return;
    try {
      await transferBed({ admission_id: dischargeTarget.id, bed_id: null, cabin_id: null }).unwrap();
    } catch {
      push({ title: ta("toasts.releaseFailed"), body: t("releaseFailedBody"), tone: "bad" });
      setDischargeTarget(null);
      return;
    }
    try {
      await updateAdmission(dischargeTarget.id, { status: "discharged", discharged_at: new Date().toISOString() }).unwrap();
      push({ title: ta("toasts.discharged"), body: ta("toasts.dischargedBody", { name: nameOf(dischargeTarget) }), tone: "ok" });
      void notify({
        kind: "patient.discharged",
        title: ta("notices.discharged", { name: nameOf(dischargeTarget) }),
        tone: "ok",
        entity_type: "admissions",
        entity_id: dischargeTarget.id,
      });
    } catch {
      push({ title: ta("toasts.halfDischarged"), body: t("halfDischargedBody"), tone: "warn" });
    }
    setDischargeTarget(null);
  };

  const availableBedsForTransfer = bedsCrud.items.filter(b => b.status === "available");
  const availableCabins = cabinsCrud.items.filter(c => c.status === "available");

  // Search match evaluator
  const checkBedMatch = useCallback((b: BedRow, occ: AdmissionRow | null | undefined, wardName?: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (b.number.toLowerCase().includes(q)) return true;
    if (wardName && wardName.toLowerCase().includes(q)) return true;
    if (b.type && b.type.toLowerCase().includes(q)) return true;
    if (occ) {
      if (occ.patients?.full_name?.toLowerCase().includes(q)) return true;
      if (occ.patients?.mrn?.toLowerCase().includes(q)) return true;
      if (occ.patients?.phone?.toLowerCase().includes(q)) return true;
      if (occ.doctors?.name?.toLowerCase().includes(q)) return true;
      if (occ.doctors?.specialty?.toLowerCase().includes(q)) return true;
      if (occ.diagnosis?.toLowerCase().includes(q)) return true;
      if (occ.priority?.toLowerCase().includes(q)) return true;
    }
    return false;
  }, [searchQuery]);

  const checkCabinMatch = useCallback((c: CabinRow, occ: AdmissionRow | null | undefined) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (c.number.toLowerCase().includes(q)) return true;
    if (c.floor && c.floor.toLowerCase().includes(q)) return true;
    if (c.category && c.category.toLowerCase().includes(q)) return true;
    if (occ) {
      if (occ.patients?.full_name?.toLowerCase().includes(q)) return true;
      if (occ.patients?.mrn?.toLowerCase().includes(q)) return true;
      if (occ.patients?.phone?.toLowerCase().includes(q)) return true;
      if (occ.doctors?.name?.toLowerCase().includes(q)) return true;
      if (occ.diagnosis?.toLowerCase().includes(q)) return true;
    }
    return false;
  }, [searchQuery]);

  // Derived / filtered
  const bedList = useMemo(() => {
    return bedFilter === "all" ? bedsCrud.items : bedsCrud.items.filter(b => b.status === bedFilter);
  }, [bedFilter, bedsCrud.items]);

  const occupiedBeds = bedsCrud.items.filter(b => b.status === "occupied").length;
  const availableBeds = bedsCrud.items.filter(b => b.status === "available").length;
  const occupancyPct = bedsCrud.items.length ? Math.round((occupiedBeds / bedsCrud.items.length) * 100) : 0;

  const matchingBedsCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    let count = 0;
    for (const b of bedsCrud.items) {
      const occ = occupantByBed.get(b.id);
      const ward = wardsCrud.items.find(w => w.id === b.ward_id);
      if (checkBedMatch(b, occ, ward?.name)) count++;
    }
    return count;
  }, [searchQuery, bedsCrud.items, occupantByBed, wardsCrud.items, checkBedMatch]);

  const cabinList = useMemo(() => {
    const list = cabFilter === "all" ? cabinsCrud.items
      : cabinsCrud.items.filter(c => c.status === cabFilter || c.category === cabFilter);
    if (!searchQuery.trim()) return list;
    return list.filter(c => checkCabinMatch(c, occupantByCabin.get(c.id)));
  }, [cabFilter, cabinsCrud.items, searchQuery, checkCabinMatch, occupantByCabin]);

  const floors = Array.from(new Set(cabinsCrud.items.map(c => c.floor)));
  const cabOccupied = cabinsCrud.items.filter(c => c.status === "occupied").length;
  const cabAvailable = cabinsCrud.items.filter(c => c.status === "available").length;
  const cabRevenue = cabinsCrud.items.filter(c => c.status === "occupied").reduce((s, c) => s + c.daily_rate, 0);
  const cabOccupancyRate = cabinsCrud.items.length ? Math.round((cabOccupied / cabinsCrud.items.length) * 100) : 0;

  const bedOccupant = bedDetail ? occupantByBed.get(bedDetail.id) ?? null : null;
  const cabinOccupant = cabinDetail ? occupantByCabin.get(cabinDetail.id) ?? null : null;

  // Print Daily Ward Census Handover Report
  const handlePrintCensus = () => {
    const hospitalNameStr = hospitalProfile?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
    const hospitalTagline = hospitalProfile?.tagline?.trim() || "Inpatient Ward Services & Bed Board Operations";
    const hospitalAddress = [
      hospitalProfile?.address?.trim(),
      hospitalProfile?.location?.trim(),
    ].filter(Boolean).join(" · ");
    const hospitalPhone = hospitalProfile?.contact_phone?.trim() || "+880 1700-000000";
    const hospitalEmail = hospitalProfile?.contact_email?.trim() || "care@healthflowbd.com";
    const hospitalLogo = (hospitalProfile?.logo_url ? mediaUrl(hospitalProfile.logo_url) : null) || BRAND_INFO.logoMark;

    const currentHour = new Date().getHours();
    const shiftStr = currentHour >= 8 && currentHour < 14
      ? "Morning Clinical Shift (08:00 – 14:00)"
      : currentHour >= 14 && currentHour < 20
      ? "Evening Clinical Shift (14:00 – 20:00)"
      : "Night Clinical Shift (20:00 – 08:00)";

    const wardsData = wardsCrud.items.map(w => {
      const wardBeds = bedsCrud.items.filter(b => b.ward_id === w.id);
      return {
        name: w.name,
        category: w.category,
        dailyRate: Number(w.daily_rate),
        beds: wardBeds.map(b => {
          const occ = occupantByBed.get(b.id);
          return {
            number: b.number,
            type: b.type,
            status: b.status,
            patientName: occ?.patients?.full_name,
            mrn: occ?.patients?.mrn || undefined,
            gender: occ?.patients?.gender,
            age: ageFromDob(occ?.patients?.date_of_birth),
            admittedAt: occ?.admitted_at ? new Date(occ.admitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : undefined,
            stayDays: occ?.admitted_at ? computeStayDays(occ.admitted_at, occ.discharged_at) : undefined,
            diagnosis: occ?.diagnosis,
            priority: occ?.priority,
            doctorName: occ?.doctors?.name ? `${occ.doctors.name}${occ.doctors.specialty ? ` (${occ.doctors.specialty})` : ""}` : undefined,
          };
        }),
      };
    });

    const cabinsData = cabinsCrud.items.map(c => {
      const occ = occupantByCabin.get(c.id);
      return {
        number: c.number,
        floor: c.floor || "1st Floor",
        category: c.category,
        dailyRate: Number(c.daily_rate),
        status: c.status,
        patientName: occ?.patients?.full_name,
        mrn: occ?.patients?.mrn || undefined,
        gender: occ?.patients?.gender,
        admittedAt: occ?.admitted_at ? new Date(occ.admitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : undefined,
        stayDays: occ?.admitted_at ? computeStayDays(occ.admitted_at, occ.discharged_at) : undefined,
        diagnosis: occ?.diagnosis,
        doctorName: occ?.doctors?.name ? `${occ.doctors.name}${occ.doctors.specialty ? ` (${occ.doctors.specialty})` : ""}` : undefined,
      };
    });

    const cleaningBedsCount = bedsCrud.items.filter(b => b.status === "cleaning").length;

    printWardCensus({
      generatedAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      shift: shiftStr,
      hospital: {
        name: hospitalNameStr,
        tagline: hospitalTagline,
        address: hospitalAddress,
        phone: hospitalPhone,
        email: hospitalEmail,
        logoUrl: hospitalLogo,
      },
      summary: {
        totalBeds: bedsCrud.items.length,
        occupiedBeds,
        availableBeds,
        cleaningBeds: cleaningBedsCount,
        occupancyPct,
        totalCabins: cabinsCrud.items.length,
        occupiedCabins: cabOccupied,
        availableCabins: cabAvailable,
      },
      wards: wardsData,
      cabins: cabinsData,
      formatCurrency,
    });
  };

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      {/* ===== Bed KPI Strip ===== */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-border/60">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{t("kpis.totalBeds")}</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="font-display text-4xl text-primary">{bedsCrud.items.length}</p>
            <span className="text-[11px] font-semibold text-muted-foreground">{t("kpis.acrossWards", { count: wardsCrud.items.length })}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${occupancyPct}%` }} />
          </div>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-[10px] tracking-widest font-bold text-destructive uppercase">{statusLabel("occupied")}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-destructive">{occupiedBeds}</p>
            <span className="text-xs font-semibold text-destructive/70">{t("kpis.capacity", { pct: occupancyPct })}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{t("kpis.livePatients")}</p>
        </Card>
        <Card className="p-5 border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-primary-glow uppercase">{statusLabel("available")}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-primary-glow">{availableBeds}</p>
            <span className="text-xs font-semibold text-primary-glow/80">{t("kpis.readyForAdmission")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{t("kpis.justNow")}</p>
        </Card>
      </div>

      {/* ===== Floor Map & Bed Operations ===== */}
      <Card className="p-6 mb-8 shadow-soft space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <SectionTitle title={t("floorMap")} />
            <p className="text-xs text-muted-foreground -mt-3">
              Real-time inpatient occupancy, bed board visualization, and clinical bed assignments
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("detailed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "detailed" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Detailed Inpatient Bed Board"
              >
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>{t("detailedView")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === "compact" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dense Square Floor Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{t("compactView")}</span>
              </button>
            </div>

            {/* Print Census Button */}
            <Btn
              variant="outline"
              onClick={handlePrintCensus}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3"
              title="Print Daily Ward Census & Shift Handover Document"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              <span>{t("printCensus")}</span>
            </Btn>

            {/* Add Bed */}
            <Btn onClick={() => setAddBed(true)} className="text-xs py-1.5 px-3">
              {t("addBed")}
            </Btn>
          </div>
        </div>

        {/* Global Search & Status Filter Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Match Counter Pill */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                🎯 {t("matchingCount", { count: matchingBedsCount })}
              </span>
            )}
            {/* Status Filter Chips */}
            <Chips value={bedFilter} onChange={setBedFilter} options={bedFilters} />
          </div>
        </div>

        {bedsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">{t("bedsLoadFailed")}</p>
        ) : bedsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tc("loading")}</p>
        ) : (
          <div className="space-y-6 mt-2">
            {wardsCrud.items.map((w) => {
              const wardBeds = bedList.filter((b) => b.ward_id === w.id);
              const wardOcc = bedsCrud.items.filter((b) => b.ward_id === w.id && b.status === "occupied").length;
              const wardTotal = bedsCrud.items.filter((b) => b.ward_id === w.id).length;
              const ratio = wardTotal > 0 ? `1:${Math.max(1, Math.round(wardTotal / (w.category === "icu" ? 2 : 4)))}` : "1:4";

              return (
                <div key={w.id} className="rounded-2xl border border-border bg-muted/30 p-5 space-y-4">
                  {/* Ward Header & Staffing Banner */}
                  <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-xl text-primary">{w.name}</h3>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          wardCategoryTone[w.category] ?? "bg-primary text-primary-foreground"
                        }`}
                      >
                        {wardCategoryLabel(w.category)}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(w.daily_rate)}
                        <span className="text-[11px] font-medium text-muted-foreground">{t("perDay")}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-card border border-border rounded-full px-2.5 py-0.5">
                        {t("wardOccupied", { occupied: wardOcc, total: wardTotal })}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {w.facilities.slice(0, 3).map((f) => (
                          <span
                            key={f}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground"
                          >
                            {featureLabel(f)}
                          </span>
                        ))}
                        {w.facilities.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 text-muted-foreground font-bold">
                            +{w.facilities.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Nursing Station Banner */}
                      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t("nurseInCharge")}</span>
                        <span className="opacity-60">·</span>
                        <span>{t("staffRatio", { ratio })}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditWard(w)}
                        className="text-[11px] text-primary font-bold underline underline-offset-4 hover:text-primary-glow cursor-pointer"
                      >
                        {t("editPricing")}
                      </button>
                    </div>
                  </div>

                  {/* ===================== VIEW MODE: COMPACT GRID ===================== */}
                  {viewMode === "compact" && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2.5">
                      {wardBeds.map((b) => {
                        const occ = occupantByBed.get(b.id);
                        const isMatch = checkBedMatch(b, occ, w.name);
                        const isCritical = occ?.priority === "critical";

                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBedDetail(b)}
                            title={occ?.patients?.full_name ? `${occ.patients.full_name} (${occ.patients.mrn})` : statusLabel(b.status)}
                            className={`relative aspect-square rounded-xl border-2 grid place-items-center font-bold p-1 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                              b.status === "occupied"
                                ? "bg-destructive/10 border-destructive/40 text-destructive"
                                : b.status === "available"
                                ? "bg-accent/30 border-accent text-accent-foreground"
                                : "bg-yellow-100 border-yellow-300 text-yellow-800"
                            } ${
                              searchQuery.trim()
                                ? isMatch
                                  ? "ring-2 ring-emerald-500 ring-offset-2 scale-105 shadow-md z-10"
                                  : "opacity-35 grayscale-30"
                                : ""
                            }`}
                          >
                            {/* Critical Acuity Pulsing Beacon */}
                            {isCritical && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                              </span>
                            )}

                            <Bed className="h-4 w-4" />
                            <span className="mt-0.5 text-xs font-mono">{b.number}</span>
                          </button>
                        );
                      })}
                      {!wardBeds.length && (
                        <p className="col-span-full text-xs text-muted-foreground py-2">{t("noBedsInWard")}</p>
                      )}
                    </div>
                  )}

                  {/* ===================== VIEW MODE: DETAILED BED BOARD ===================== */}
                  {viewMode === "detailed" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {wardBeds.map((b) => {
                        const occ = occupantByBed.get(b.id);
                        const isMatch = checkBedMatch(b, occ, w.name);
                        const stayDays = occ?.admitted_at ? computeStayDays(occ.admitted_at, occ.discharged_at) : 1;
                        const age = ageFromDob(occ?.patients?.date_of_birth);
                        const genderStr =
                          occ?.patients?.gender === "male"
                            ? `♂ ${t("male")}`
                            : occ?.patients?.gender === "female"
                            ? `♀ ${t("female")}`
                            : occ?.patients?.gender || "";

                        return (
                          <div
                            key={b.id}
                            className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                              b.status === "occupied"
                                ? "bg-card border-border/80 shadow-xs"
                                : b.status === "available"
                                ? "bg-emerald-500/5 border-emerald-500/30 border-dashed"
                                : "bg-amber-500/5 border-amber-500/30 border-dashed"
                            } ${
                              searchQuery.trim()
                                ? isMatch
                                  ? "ring-2 ring-emerald-500 ring-offset-2 shadow-md"
                                  : "opacity-40"
                                : ""
                            }`}
                          >
                            {/* Card Top: Bed ID & Status */}
                            <div>
                              <div className="flex items-center justify-between pb-2.5 border-b border-border/50 gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`p-1.5 rounded-lg ${
                                      b.status === "occupied"
                                        ? "bg-destructive/10 text-destructive"
                                        : b.status === "available"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "bg-amber-500/10 text-amber-600"
                                    }`}
                                  >
                                    <Bed className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-mono font-black text-sm text-foreground">
                                      {bedName(b.number)}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-muted/60">
                                      {bedTypeLabel(b.type)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Acuity Badge for Occupied */}
                                  {b.status === "occupied" && occ && (
                                    <>
                                      {occ.priority === "critical" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                                          <AlertTriangle className="h-2.5 w-2.5" /> {t("critical")}
                                        </span>
                                      ) : occ.priority === "urgent" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                          <Clock className="h-2.5 w-2.5" /> {t("urgent")}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                                          {t("routine")}
                                        </span>
                                      )}
                                    </>
                                  )}

                                  <Pill
                                    tone={b.status === "occupied" ? "bad" : b.status === "available" ? "ok" : "warn"}
                                  >
                                    {statusLabel(b.status)}
                                  </Pill>
                                </div>
                              </div>

                              {/* Card Content based on Bed Status */}
                              {b.status === "occupied" && occ ? (
                                <div className="py-3 space-y-2 text-xs">
                                  {/* Patient Identity */}
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => setBedDetail(b)}
                                        className="font-bold text-sm text-primary hover:underline text-left leading-tight"
                                      >
                                        {occ.patients?.full_name || t("unknown")}
                                      </button>
                                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                        MRN: #{occ.patients?.mrn || "—"} · {genderStr} {age !== null ? `· ${age}y` : ""}
                                      </p>
                                    </div>

                                    {/* Stay Duration */}
                                    <span
                                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                                        stayDays >= 14
                                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                          : "bg-muted text-foreground/80"
                                      }`}
                                      title={`Admitted on ${new Date(occ.admitted_at).toLocaleDateString()}`}
                                    >
                                      {stayDays >= 14
                                        ? `⚠️ ${t("longStayWarning", { days: stayDays })}`
                                        : t("losDays", { days: stayDays })}
                                    </span>
                                  </div>

                                  {/* Attending Doctor */}
                                  {occ.doctors?.name && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="truncate">
                                        {occ.doctors.name} {occ.doctors.specialty ? `· ${occ.doctors.specialty}` : ""}
                                      </span>
                                    </div>
                                  )}

                                  {/* Diagnosis */}
                                  {occ.diagnosis && (
                                    <p className="text-[11px] text-foreground/85 bg-muted/40 px-2.5 py-1 rounded-md italic line-clamp-1 border border-border/40">
                                      Dx: {occ.diagnosis}
                                    </p>
                                  )}
                                </div>
                              ) : b.status === "available" ? (
                                <div className="py-4 text-center space-y-1">
                                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    {t("kpis.readyForAdmission")}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Sanitized & prepared for new patient check-in
                                  </p>
                                </div>
                              ) : (
                                <div className="py-4 text-center space-y-1 text-amber-800 dark:text-amber-400">
                                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>{t("sanitizingActive")}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Disinfection and linen turnover protocol active
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Card Bottom Actions */}
                            <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-1.5">
                              {b.status === "occupied" && occ ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openTransfer(occ)}
                                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer"
                                      title={ta("transfer")}
                                    >
                                      <ArrowRightLeft className="h-3 w-3 text-primary" />
                                      <span>{ta("transfer")}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDischarge(occ)}
                                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 cursor-pointer"
                                      title={ta("discharge")}
                                    >
                                      <LogOut className="h-3 w-3" />
                                      <span>{ta("discharge")}</span>
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setBedDetail(b)}
                                    className="text-xs font-semibold p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    title={t("details")}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : b.status === "available" ? (
                                <>
                                  <Btn
                                    onClick={() =>
                                      openAdmit({
                                        bed_id: b.id,
                                        label: `${w.name} · ${bedName(b.number)}`,
                                      })
                                    }
                                    className="w-full justify-center text-xs py-1.5"
                                  >
                                    {t("admitPatient")}
                                  </Btn>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditBedMeta(b);
                                      setBedDetail(null);
                                    }}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted transition-colors cursor-pointer"
                                    title={t("editDetails")}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <Btn
                                  variant="outline"
                                  onClick={() => markBedAvailable(b)}
                                  className="w-full justify-center text-xs py-1.5 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                  <span>{t("markSanitizedReady")}</span>
                                </Btn>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {!wardBeds.length && (
                        <p className="col-span-full text-xs text-muted-foreground py-4 text-center">
                          {t("noBedsInWard")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!wardsCrud.items.length && (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("noWards")}</p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-5 text-[11px] font-semibold text-muted-foreground border-t border-border pt-4">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive" /> {statusLabel("occupied")}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent" /> {statusLabel("available")}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400" /> {statusLabel("cleaning")}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-red-600 font-bold">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Critical Acuity
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
              <Clock className="h-3 w-3" /> Urgent
            </span>
          </div>
        </div>
      </Card>

      {/* ===== Ward Pricing & Facilities ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title={t("wardPricing")} action={<Btn onClick={openAddWard}>{t("addWard")}</Btn>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {wardsCrud.items.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => openEditWard(w)}
              className="text-left rounded-2xl border border-border bg-card p-5 hover:shadow-card hover:border-primary/50 hover:-translate-y-0.5 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-accent/30 group-hover:bg-accent/50 transition-colors">
                  <Bed className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    wardCategoryTone[w.category] ?? "bg-primary text-primary-foreground"
                  }`}
                >
                  {wardCategoryLabel(w.category)}
                </span>
              </div>
              <h4 className="font-display text-lg text-primary">{w.name}</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-3xl text-foreground">{formatCurrency(w.daily_rate)}</span>
                <span className="text-xs text-muted-foreground">{t("slashDay")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t("nursingCharge", { amount: formatCurrency(w.nursing_charge) })}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {w.facilities.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/80 font-medium"
                  >
                    {featureLabel(f)}
                  </span>
                ))}
              </div>
              {w.notes && (
                <p className="text-[11px] text-muted-foreground italic mt-4 pt-3 border-t border-border">{w.notes}</p>
              )}
            </button>
          ))}
          {!wardsCrud.items.length && (
            <p className="text-sm text-muted-foreground py-6 col-span-full text-center">{t("noWardPricing")}</p>
          )}
        </div>
      </Card>

      {/* ===== Private Cabin KPI Strip ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 bg-primary text-primary-foreground border-primary">
          <p className="text-[10px] tracking-widest font-bold opacity-80 uppercase">{t("kpis.totalCabins")}</p>
          <p className="font-display text-4xl mt-2">{cabinsCrud.items.length}</p>
          <p className="text-[11px] opacity-70 mt-3">{t("kpis.acrossFloors", { count: floors.length })}</p>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-[10px] tracking-widest font-bold text-destructive uppercase">{statusLabel("occupied")}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-destructive">{cabOccupied}</p>
            <span className="text-xs font-semibold text-destructive/70">({cabOccupancyRate}%)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{t("kpis.activeStays")}</p>
        </Card>
        <Card className="p-5 border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-primary-glow uppercase">{statusLabel("available")}</p>
          <p className="font-display text-4xl text-primary-glow mt-2">{cabAvailable}</p>
          <p className="text-[11px] text-muted-foreground mt-3">{t("kpis.readyToBook")}</p>
        </Card>
        <Card className="p-5 bg-primary-glow text-primary-foreground border-primary-glow">
          <p className="text-[10px] tracking-widest font-bold opacity-80 uppercase">{t("kpis.dailyRevenue")}</p>
          <p className="font-display text-4xl mt-2">{formatCurrency(cabRevenue)}</p>
          <p className="text-[11px] opacity-70 mt-3">{t("kpis.fromOccupied")}</p>
        </Card>
      </div>

      {/* ===== Private Cabin Management ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle
          title={t("cabinManagement")}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Chips value={cabFilter} onChange={setCabFilter} options={cabinFilters} />
              <Btn onClick={openAddCabin}>{t("addCabin")}</Btn>
            </div>
          }
        />

        {cabinsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">{t("cabinsLoadFailed")}</p>
        ) : cabinsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tc("loading")}</p>
        ) : (
          <DataTable<CabinRow>
            rows={cabinList}
            onRow={(c) => setCabinDetail(c)}
            empty={t("noCabins")}
            columns={[
              {
                key: "number",
                label: t("fields.cabinNumber"),
                sortable: true,
                accessor: (c) => c.number,
                render: (c) => (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <Home className="h-3.5 w-3.5" />
                    {c.number}
                  </span>
                ),
              },
              {
                key: "daily_rate",
                label: t("fields.dailyRate", { symbol: currencySymbol() }),
                sortable: true,
                accessor: (c) => c.daily_rate,
                render: (c) => formatCurrency(c.daily_rate),
              },
              {
                key: "status",
                label: ta("columns.status"),
                render: (c) => (
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      cabinStatusBg[c.status] ?? ""
                    }`}
                  >
                    {statusLabel(c.status)}
                  </span>
                ),
              },
              {
                key: "occupant",
                label: ta("columns.patient"),
                render: (c) => {
                  const occ = occupantByCabin.get(c.id);
                  if (occ) return <span className="text-foreground/85 font-semibold">{occ.patients?.full_name ?? t("unknown")}</span>;
                  return (
                    <span className="text-muted-foreground italic">
                      {c.status === "available"
                        ? t("cabinNote.available")
                        : c.status === "reserved"
                        ? c.admitted_on
                          ? t("cabinNote.reservedFor", { date: c.admitted_on })
                          : statusLabel("reserved")
                        : c.status === "cleaning"
                        ? t("cabinNote.cleaning")
                        : t("cabinNote.outOfService")}
                    </span>
                  );
                },
              },
            ] satisfies Column<CabinRow>[]}
          />
        )}
      </Card>

      {/* ===== Bed detail / actions Modal ===== */}
      <Modal
        open={!!bedDetail}
        onClose={() => setBedDetail(null)}
        title={bedDetail ? bedName(bedDetail.number) : ""}
        footer={
          <>
            {bedDetail && bedDetail.status !== "occupied" && (
              <button
                type="button"
                onClick={() => setDelBed(bedDetail.id)}
                className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive cursor-pointer"
              >
                {tc("delete")}
              </button>
            )}
            <Btn variant="outline" onClick={() => setBedDetail(null)}>
              {tc("close")}
            </Btn>
          </>
        }
      >
        {bedDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
                  {bedDetail.wards?.name ?? ta("ward")} · {bedTypeLabel(bedDetail.type)}
                </p>
                <Pill tone={bedDetail.status === "occupied" ? "bad" : bedDetail.status === "available" ? "ok" : "warn"}>
                  {statusLabel(bedDetail.status)}
                </Pill>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditBedMeta(bedDetail);
                  setBedDetail(null);
                }}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> {t("editDetails")}
              </button>
            </div>

            {bedDetail.status === "occupied" && bedOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {ta("columns.patient")}
                  </p>
                  <p className="font-semibold text-primary">{bedOccupant.patients?.full_name ?? t("unknown")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageLine(bedOccupant)}
                    {bedOccupant.patients?.gender ?? ""}
                    {bedOccupant.doctors?.name ? ` · ${bedOccupant.doctors.name}` : ""}
                  </p>
                  {bedOccupant.diagnosis && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {ta("diagnosisLine", { diagnosis: bedOccupant.diagnosis })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(bedOccupant)}>
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" /> {ta("transfer")}
                  </Btn>
                  <Btn variant="outline" onClick={() => openDischarge(bedOccupant)}>
                    <LogOut className="h-4 w-4 mr-1.5" /> {ta("discharge")}
                  </Btn>
                </div>
              </div>
            ) : bedDetail.status === "available" ? (
              <Btn
                onClick={() =>
                  openAdmit({
                    bed_id: bedDetail.id,
                    label: `${bedDetail.wards?.name ?? ta("ward")} · ${bedName(bedDetail.number)}`,
                  })
                }
                className="w-full justify-center"
              >
                {t("admitHere")}
              </Btn>
            ) : (
              <div className="rounded-xl border border-border/60 bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-800 mb-3">{t("sanitizing")}</p>
                <Btn variant="outline" onClick={() => markBedAvailable(bedDetail)}>
                  {t("markAvailable")}
                </Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!delBed}
        onClose={() => setDelBed(null)}
        onConfirm={() => {
          if (delBed) bedsCrud.remove(delBed);
        }}
        title={t("removeBed")}
        description={t("removeBedBody")}
      />

      {/* ===== Cabin detail / actions Modal ===== */}
      <Modal
        open={!!cabinDetail}
        onClose={() => setCabinDetail(null)}
        title={cabinDetail ? cabinName(cabinDetail.number) : ""}
        footer={
          <>
            {cabinDetail && cabinDetail.status !== "occupied" && (
              <button
                type="button"
                onClick={() => setDelCabin(cabinDetail.id)}
                className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive cursor-pointer"
              >
                {tc("delete")}
              </button>
            )}
            <Btn variant="outline" onClick={() => setCabinDetail(null)}>
              {tc("close")}
            </Btn>
          </>
        }
      >
        {cabinDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">
                  {t("capacityShort", { count: cabinDetail.capacity })}
                </p>
                <Pill tone={cabinDetail.status === "occupied" ? "bad" : cabinDetail.status === "available" ? "ok" : "warn"}>
                  {statusLabel(cabinDetail.status)}
                </Pill>
              </div>
              <button
                type="button"
                onClick={() => {
                  openEditCabinMeta(cabinDetail);
                  setCabinDetail(null);
                }}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" /> {t("editDetails")}
              </button>
            </div>

            {cabinDetail.status === "occupied" && cabinOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {ta("columns.patient")}
                  </p>
                  <p className="font-semibold text-primary">{cabinOccupant.patients?.full_name ?? t("unknown")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageLine(cabinOccupant)}
                    {cabinOccupant.patients?.gender ?? ""}
                    {cabinOccupant.doctors?.name ? ` · ${cabinOccupant.doctors.name}` : ""}
                  </p>
                  {cabinOccupant.diagnosis && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {ta("diagnosisLine", { diagnosis: cabinOccupant.diagnosis })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(cabinOccupant)}>
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" /> {ta("transfer")}
                  </Btn>
                  <Btn variant="outline" onClick={() => openDischarge(cabinOccupant)}>
                    <LogOut className="h-4 w-4 mr-1.5" /> {ta("discharge")}
                  </Btn>
                </div>
              </div>
            ) : cabinDetail.status === "available" ? (
              <>
                <Btn
                  onClick={() => openAdmit({ cabin_id: cabinDetail.id, label: cabinName(cabinDetail.number) })}
                  className="w-full justify-center"
                >
                  {t("admitHere")}
                </Btn>
                <Field label={t("orSetStatus")}>
                  <Select
                    value={cabinDetail.status}
                    onChange={(e) => setCabinManualStatus(cabinDetail, e.target.value)}
                  >
                    {CABIN_MANUAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <Field label={ta("columns.status")}>
                <Select
                  value={cabinDetail.status}
                  onChange={(e) => setCabinManualStatus(cabinDetail, e.target.value)}
                >
                  {CABIN_MANUAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!delCabin}
        onClose={() => setDelCabin(null)}
        onConfirm={() => {
          if (delCabin) cabinsCrud.remove(delCabin);
        }}
        title={t("removeCabin")}
        description={t("removeCabinBody")}
      />

      {/* ===== Admit modal (shared: bed or cabin) ===== */}
      <Modal
        open={!!admitTarget}
        onClose={() => setAdmitTarget(null)}
        title={t("admitTo", { place: admitTarget?.label ?? "" })}
        size="lg"
        footer={
          <>
            <Btn variant="outline" onClick={() => setAdmitTarget(null)}>
              {tc("cancel")}
            </Btn>
            <Btn onClick={submitAdmit}>{ta("admitPatient")}</Btn>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label={ta("columns.patient")} required>
            <Select
              value={admitDraft.patient_id}
              onChange={(e) => setAdmitDraft((d) => ({ ...d, patient_id: e.target.value }))}
            >
              {patientOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={ta("fields.doctor")}>
            <Select
              value={admitDraft.doctor_id}
              onChange={(e) => setAdmitDraft((d) => ({ ...d, doctor_id: e.target.value }))}
            >
              {doctorOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={ta("columns.diagnosis")}>
            <Input
              value={admitDraft.diagnosis}
              onChange={(e) => setAdmitDraft((d) => ({ ...d, diagnosis: e.target.value }))}
              placeholder={ta("fields.diagnosisPlaceholder")}
            />
          </Field>
          <Field label={ta("columns.priority")}>
            <Select
              value={admitDraft.priority}
              onChange={(e) => setAdmitDraft((d) => ({ ...d, priority: e.target.value }))}
            >
              <option value="routine">{ta("priorities.routine")}</option>
              <option value="urgent">{ta("priorities.urgent")}</option>
              <option value="critical">{ta("priorities.critical")}</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* ===== Transfer modal (shared) ===== */}
      <Modal
        open={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title={ta("transferTitle", { name: transferTarget?.patients?.full_name ?? "" })}
        footer={
          <>
            <Btn variant="outline" onClick={() => setTransferTarget(null)}>
              {tc("cancel")}
            </Btn>
            <Btn onClick={submitTransfer} disabled={!transferChoice.bed_id && !transferChoice.cabin_id}>
              {ta("movePatient")}
            </Btn>
          </>
        }
      >
        <Field label={ta("fields.moveToBed")}>
          <Select
            value={transferChoice.bed_id}
            onChange={(e) =>
              setTransferChoice({ bed_id: e.target.value, cabin_id: e.target.value ? "" : transferChoice.cabin_id })
            }
          >
            <option value="">{ta("noBed")}</option>
            {availableBedsForTransfer.map((b) => (
              <option key={b.id} value={b.id}>
                {b.wards?.name ?? ta("ward")} · {bedName(b.number)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={ta("fields.moveToCabin")}>
          <Select
            value={transferChoice.cabin_id}
            onChange={(e) =>
              setTransferChoice({ cabin_id: e.target.value, bed_id: e.target.value ? "" : transferChoice.bed_id })
            }
          >
            <option value="">{ta("noCabin")}</option>
            {availableCabins.map((c) => (
              <option key={c.id} value={c.id}>
                {cabinName(c.number)} ({cabinCategoryLabel(c.category)})
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
      <ConfirmDialog
        open={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        onConfirm={confirmDischarge}
        title={
          dischargeTarget?.patients?.full_name
            ? ta("dischargeTitle", { name: dischargeTarget.patients.full_name })
            : ta("dischargeTitleAnon")
        }
        description={t("dischargeBody")}
      />

      {/* ===== Add/Edit bed metadata Modal ===== */}
      <Modal
        open={addBed || !!editBedMeta}
        onClose={() => {
          setAddBed(false);
          setEditBedMeta(null);
          bedsCrud.clearFieldErrors();
        }}
        title={editBedMeta ? bedName(editBedMeta.number) : t("addBedTitle")}
        footer={
          <>
            <Btn
              variant="outline"
              onClick={() => {
                setAddBed(false);
                setEditBedMeta(null);
                bedsCrud.clearFieldErrors();
              }}
            >
              {tc("cancel")}
            </Btn>
            <button
              form="bed-form"
              type="submit"
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {tc("save")}
            </button>
          </>
        }
      >
        <form
          id="bed-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveBedMeta(new FormData(e.currentTarget));
          }}
        >
          <Field label={ta("ward")} required error={bedsCrud.fieldErrors.ward_id}>
            <Select name="ward_id" defaultValue={editBedMeta?.ward_id} aria-invalid={!!bedsCrud.fieldErrors.ward_id}>
              {wardsCrud.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("fields.bedNumber")} required error={bedsCrud.fieldErrors.number}>
            <Input
              name="number"
              defaultValue={editBedMeta?.number}
              required
              aria-invalid={!!bedsCrud.fieldErrors.number}
            />
          </Field>
          <Field label={t("fields.type")} error={bedsCrud.fieldErrors.type}>
            <Select
              name="type"
              defaultValue={editBedMeta?.type ?? "general"}
              aria-invalid={!!bedsCrud.fieldErrors.type}
            >
              {BED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {bedTypeLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit cabin metadata Modal ===== */}
      <Modal
        open={addCabin || !!editCabinMeta}
        onClose={() => {
          setAddCabin(false);
          setEditCabinMeta(null);
          cabinsCrud.clearFieldErrors();
        }}
        title={editCabinMeta ? cabinName(editCabinMeta.number) : t("addCabinTitle")}
        footer={
          <>
            <Btn
              variant="outline"
              onClick={() => {
                setAddCabin(false);
                setEditCabinMeta(null);
                cabinsCrud.clearFieldErrors();
              }}
            >
              {tc("cancel")}
            </Btn>
            <button
              form="cabin-form"
              type="submit"
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {tc("save")}
            </button>
          </>
        }
      >
        <form
          id="cabin-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveCabinMeta(new FormData(e.currentTarget));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("fields.cabinNumber")} required error={cabinsCrud.fieldErrors.number}>
              <Input
                name="number"
                defaultValue={editCabinMeta?.number}
                required
                aria-invalid={!!cabinsCrud.fieldErrors.number}
              />
            </Field>
            <Field label={t("fields.dailyRate", { symbol: currencySymbol() })} error={cabinsCrud.fieldErrors.daily_rate}>
              <Input
                name="daily_rate"
                type="number"
                min="0"
                defaultValue={editCabinMeta?.daily_rate || 0}
                aria-invalid={!!cabinsCrud.fieldErrors.daily_rate}
              />
            </Field>
            {!editCabinMeta && (
              <Field label={t("fields.totalCabins")} hint={t("fields.totalCabinsHint")}>
                <Input name="total_cabins" type="number" min="0" placeholder="1" />
              </Field>
            )}
          </div>
          <Field label={t("fields.amenities")}>
            <div className="flex flex-wrap gap-2">
              {AMENITY_LIST.map((a) => {
                const active = amenityDraft.includes(a);
                const Icon = AMENITY_ICON[a];
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3" />} {featureLabel(a)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("fields.notes")} error={cabinsCrud.fieldErrors.notes}>
            <Input
              name="notes"
              defaultValue={editCabinMeta?.notes ?? ""}
              placeholder={t("fields.notesPlaceholder")}
              aria-invalid={!!cabinsCrud.fieldErrors.notes}
            />
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit ward pricing Modal ===== */}
      <Modal
        open={addWard || !!editWard}
        onClose={() => {
          setAddWard(false);
          setEditWard(null);
          wardsCrud.clearFieldErrors();
        }}
        title={editWard ? t("wardPricingTitle", { name: editWard.name }) : t("addWardTitle")}
        footer={
          <>
            {editWard && (
              <button
                type="button"
                onClick={() => setDelWard(editWard.id)}
                className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive cursor-pointer"
              >
                {tc("delete")}
              </button>
            )}
            <Btn
              variant="outline"
              onClick={() => {
                setAddWard(false);
                setEditWard(null);
                wardsCrud.clearFieldErrors();
              }}
            >
              {tc("cancel")}
            </Btn>
            <button
              form="ward-form"
              type="submit"
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              {tc("save")}
            </button>
          </>
        }
      >
        <form
          id="ward-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveWard(new FormData(e.currentTarget));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("fields.wardName")} required error={wardsCrud.fieldErrors.name}>
              <Input
                name="name"
                defaultValue={editWard?.name}
                required
                placeholder={t("fields.wardNamePlaceholder")}
                aria-invalid={!!wardsCrud.fieldErrors.name}
              />
            </Field>
            <Field
              label={t("fields.wardDailyRate", { symbol: currencySymbol() })}
              required
              error={wardsCrud.fieldErrors.daily_rate}
            >
              <Input
                name="daily_rate"
                type="number"
                min="0"
                defaultValue={editWard?.daily_rate || 0}
                required
                aria-invalid={!!wardsCrud.fieldErrors.daily_rate}
              />
            </Field>
            {!editWard && (
              <Field label={t("fields.totalBeds")} hint={t("fields.totalBedsHint")}>
                <Input name="total_beds" type="number" min="0" placeholder="0" />
              </Field>
            )}
          </div>
          <Field label={t("fields.facilities")}>
            <div className="flex flex-wrap gap-2">
              {WARD_FACILITY_LIST.map((f) => {
                const active = facDraft.includes(f);
                return (
                  <button
                    type="button"
                    key={f}
                    onClick={() => toggleFac(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {featureLabel(f)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("fields.notes")} error={wardsCrud.fieldErrors.notes}>
            <Input
              name="notes"
              defaultValue={editWard?.notes ?? ""}
              placeholder={t("fields.notesPlaceholder")}
              aria-invalid={!!wardsCrud.fieldErrors.notes}
            />
          </Field>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!delWard}
        onClose={() => setDelWard(null)}
        onConfirm={() => {
          if (delWard) wardsCrud.remove(delWard);
          setEditWard(null);
        }}
        title={t("removeWard")}
        description={t("removeWardBody")}
      />
    </AdminLayout>
  );
};

export default Wards;
