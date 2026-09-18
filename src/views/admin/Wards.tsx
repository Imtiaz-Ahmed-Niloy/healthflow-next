"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, Chips, ConfirmDialog } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useFormatters } from "@/lib/appSettings";
import { useTransferBedMutation } from "@/redux/api/bedTransfers";
import {
  admissionsApi, doctorsApi, patientsApi,
  type WardRow, type BedRow, type CabinRow, type AdmissionRow,
} from "@/redux/api/resources";
import { Bed, Home, Wifi, Tv, Wind, Coffee, Bath, Users, Pencil, ArrowRightLeft, LogOut } from "lucide-react";

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
const cabinBorder: Record<string, string> = {
  available: "border-l-primary-glow",
  occupied: "border-l-destructive",
  reserved: "border-l-blue-500",
  cleaning: "border-l-yellow-400",
  maintenance: "border-l-orange-500",
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

  // Money in the currency set in global settings — this page had ₹ typed
  // into it, whatever the platform was configured to use.
  const { formatCurrency, currencySymbol } = useFormatters();
  const wardsCrud = useResourceCrud<WardRow>("wards");
  const bedsCrud = useResourceCrud<BedRow>("beds");
  const cabinsCrud = useResourceCrud<CabinRow>("cabins");
  const { push, notify } = useNotifications();
  const { admit } = useAdmitPatient();
  const [transferBed] = useTransferBedMutation();
  const [updateAdmission] = admissionsApi.useUpdate();

  // Read-only here — resolving "who is in this bed/cabin" without touching
  // the transitional beds.patient/cabins.patient/cabins.attendant columns.
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
      category: fd.get("category") as WardRow["category"],
      daily_rate: Number(fd.get("daily_rate")) || 0,
      nursing_charge: Number(fd.get("nursing_charge")) || 0,
      facilities: facDraft,
      notes: String(fd.get("notes") || "") || null,
    };
    if (editWard) {
      const ok = await wardsCrud.update(editWard.id, data);
      if (ok) setEditWard(null);
    } else {
      // useResourceCrud.create() types its argument as Omit<Row, "id">, but
      // the server fills tenant_id/created_at/updated_at (and, for beds, the
      // embedded wards relation) — matching ResourcePage.tsx's own `as never`
      // at the same spot for the same reason.
      const created = await wardsCrud.create(data as never);
      if (created) setAddWard(false);
    }
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
    const data = {
      number: String(fd.get("number")),
      category: fd.get("category") as CabinRow["category"],
      floor: String(fd.get("floor")),
      capacity: Number(fd.get("capacity")) || 1,
      daily_rate: Number(fd.get("daily_rate")) || 0,
      amenities: amenityDraft,
    };
    if (editCabinMeta) {
      const ok = await cabinsCrud.update(editCabinMeta.id, data);
      if (ok) setEditCabinMeta(null);
    } else {
      const created = await cabinsCrud.create(data as never);
      if (created) setAddCabin(false);
    }
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
      // Name only for the notice-board line — see AdmitInput.patientName.
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
  /**
   * Release the bed FIRST, then flip the status — same order and same reason
   * as Admissions.tsx's confirmDischarge: transfer_admission() rejects an
   * admission that already carries a discharged_at (HF003), so the other way
   * round leaves the patient discharged and the bed still occupied.
   */
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

  // ---- derived / filtered ----
  const bedList = bedFilter === "all" ? bedsCrud.items : bedsCrud.items.filter(b => b.status === bedFilter);
  const occupiedBeds = bedsCrud.items.filter(b => b.status === "occupied").length;
  const availableBeds = bedsCrud.items.filter(b => b.status === "available").length;
  const occupancyPct = bedsCrud.items.length ? Math.round((occupiedBeds / bedsCrud.items.length) * 100) : 0;

  const cabinList = cabFilter === "all" ? cabinsCrud.items
    : cabinsCrud.items.filter(c => c.status === cabFilter || c.category === cabFilter);
  const floors = Array.from(new Set(cabinsCrud.items.map(c => c.floor)));
  const cabOccupied = cabinsCrud.items.filter(c => c.status === "occupied").length;
  const cabAvailable = cabinsCrud.items.filter(c => c.status === "available").length;
  const cabRevenue = cabinsCrud.items.filter(c => c.status === "occupied").reduce((s, c) => s + c.daily_rate, 0);
  const cabOccupancyRate = cabinsCrud.items.length ? Math.round((cabOccupied / cabinsCrud.items.length) * 100) : 0;

  const bedOccupant = bedDetail ? occupantByBed.get(bedDetail.id) ?? null : null;
  const cabinOccupant = cabinDetail ? occupantByCabin.get(cabinDetail.id) ?? null : null;

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

      {/* ===== Floor Map ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title={t("floorMap")} action={<div className="flex items-center gap-2 flex-wrap">
          <Chips value={bedFilter} onChange={setBedFilter} options={bedFilters} />
          <Btn onClick={() => setAddBed(true)}>{t("addBed")}</Btn>
        </div>} />

        {bedsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">{t("bedsLoadFailed")}</p>
        ) : bedsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tc("loading")}</p>
        ) : (
          <div className="space-y-6 mt-2">
            {wardsCrud.items.map(w => {
              const wardBeds = bedList.filter(b => b.ward_id === w.id);
              const wardOcc = bedsCrud.items.filter(b => b.ward_id === w.id && b.status === "occupied").length;
              const wardTotal = bedsCrud.items.filter(b => b.ward_id === w.id).length;
              return (
                <div key={w.id} className="rounded-2xl border border-border bg-muted/30 p-5">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-xl text-primary">{w.name}</h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${wardCategoryTone[w.category] ?? "bg-primary text-primary-foreground"}`}>{wardCategoryLabel(w.category)}</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(w.daily_rate)}<span className="text-[11px] font-medium text-muted-foreground">{t("perDay")}</span></span>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5">
                        {t("wardOccupied", { occupied: wardOcc, total: wardTotal })}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {w.facilities.slice(0, 3).map(f => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">{featureLabel(f)}</span>
                        ))}
                        {w.facilities.length > 3 && <span className="text-[10px] px-2 py-0.5 text-muted-foreground font-bold">+{w.facilities.length - 3}</span>}
                      </div>
                    </div>
                    <button onClick={() => openEditWard(w)} className="text-[11px] text-primary font-bold underline underline-offset-4 hover:text-primary-glow">
                      {t("editPricing")}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                    {wardBeds.map(b => {
                      const occ = occupantByBed.get(b.id);
                      return (
                        <button key={b.id} onClick={() => setBedDetail(b)} title={occ?.patients?.full_name || statusLabel(b.status)}
                          className={`aspect-square rounded-xl border-2 grid place-items-center text-[10px] font-bold p-1 transition hover:shadow-md hover:-translate-y-0.5
                            ${b.status === "occupied" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                              b.status === "available" ? "bg-accent/30 border-accent text-accent-foreground" :
                              "bg-yellow-100 border-yellow-300 text-yellow-800"}`}>
                          <Bed className="h-4 w-4" />
                          <span className="mt-0.5">{b.number}</span>
                        </button>
                      );
                    })}
                    {!wardBeds.length && <p className="col-span-full text-xs text-muted-foreground py-2">{t("noBedsInWard")}</p>}
                  </div>
                </div>
              );
            })}
            {!wardsCrud.items.length && <p className="text-sm text-muted-foreground py-6 text-center">{t("noWards")}</p>}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-5 text-[11px] font-semibold text-muted-foreground border-t border-border pt-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> {statusLabel("occupied")}</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent" /> {statusLabel("available")}</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> {statusLabel("cleaning")}</div>
        </div>
      </Card>

      {/* ===== Ward Pricing & Facilities ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title={t("wardPricing")} action={<Btn onClick={openAddWard}>{t("addWard")}</Btn>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {wardsCrud.items.map(w => (
            <button key={w.id} onClick={() => openEditWard(w)} className="text-left rounded-2xl border border-border bg-card p-5 hover:shadow-card hover:border-primary/50 hover:-translate-y-0.5 transition group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-accent/30 group-hover:bg-accent/50 transition">
                  <Bed className="h-5 w-5 text-primary" />
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${wardCategoryTone[w.category] ?? "bg-primary text-primary-foreground"}`}>{wardCategoryLabel(w.category)}</span>
              </div>
              <h4 className="font-display text-lg text-primary">{w.name}</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-3xl text-foreground">{formatCurrency(w.daily_rate)}</span>
                <span className="text-xs text-muted-foreground">{t("slashDay")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{t("nursingCharge", { amount: formatCurrency(w.nursing_charge) })}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {w.facilities.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/80 font-medium">{featureLabel(f)}</span>
                ))}
              </div>
              {w.notes && <p className="text-[11px] text-muted-foreground italic mt-4 pt-3 border-t border-border">{w.notes}</p>}
            </button>
          ))}
          {!wardsCrud.items.length && <p className="text-sm text-muted-foreground py-6 col-span-full text-center">{t("noWardPricing")}</p>}
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
        <SectionTitle title={t("cabinManagement")} action={<div className="flex items-center gap-2 flex-wrap">
          <Chips value={cabFilter} onChange={setCabFilter} options={cabinFilters} />
          <Btn onClick={openAddCabin}>{t("addCabin")}</Btn>
        </div>} />

        {cabinsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">{t("cabinsLoadFailed")}</p>
        ) : cabinsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tc("loading")}</p>
        ) : (
          <div className="space-y-8 mt-2">
            {floors.map(f => {
              const items = cabinList.filter(c => c.floor === f);
              if (!items.length) return null;
              return (
                <div key={f}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px w-8 bg-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">{f}</span>
                    <span className="text-[11px] text-muted-foreground">({items.length})</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(c => {
                      const occ = occupantByCabin.get(c.id);
                      return (
                        <button key={c.id} onClick={() => setCabinDetail(c)}
                          className={`text-left rounded-2xl bg-card border border-border border-l-[6px] ${cabinBorder[c.status] ?? "border-l-border"} p-5 hover:shadow-card hover:-translate-y-0.5 transition group`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-primary" />
                                <h5 className="font-display text-lg text-primary">{c.number}</h5>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border font-bold uppercase tracking-tight text-muted-foreground">{cabinCategoryLabel(c.category)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5">
                                <Users className="h-3 w-3" /> {t("capacityShort", { count: c.capacity })}
                                <span>•</span>
                                <span className="font-bold text-foreground">{formatCurrency(c.daily_rate)}{t("perDay")}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${cabinStatusBg[c.status] ?? ""}`}>{statusLabel(c.status)}</span>
                          </div>
                          {occ ? (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/60">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{ta("columns.patient")}</p>
                              <p className="text-sm font-bold text-foreground">{occ.patients?.full_name ?? t("unknown")}</p>
                              {occ.doctors?.name && <p className="text-[11px] text-muted-foreground mt-0.5">{t("doctorLine", { name: occ.doctors.name })}</p>}
                            </div>
                          ) : (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/40">
                              <p className="text-[11px] text-muted-foreground italic">
                                {c.status === "available" ? t("cabinNote.available")
                                  : c.status === "reserved" ? (c.admitted_on ? t("cabinNote.reservedFor", { date: c.admitted_on }) : statusLabel("reserved"))
                                  : c.status === "cleaning" ? t("cabinNote.cleaning") : t("cabinNote.outOfService")}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                            {c.amenities.map(a => {
                              const Icon = AMENITY_ICON[a];
                              return (
                                <span key={a} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground font-medium">
                                  {Icon && <Icon className="h-2.5 w-2.5" />} {featureLabel(a)}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!cabinList.length && <p className="text-sm text-muted-foreground text-center py-6">{t("noCabins")}</p>}
          </div>
        )}
      </Card>

      {/* ===== Bed detail / actions ===== */}
      <Modal open={!!bedDetail} onClose={() => setBedDetail(null)}
        title={bedDetail ? bedName(bedDetail.number) : ""}
        footer={<>
          {bedDetail && bedDetail.status !== "occupied" && (
            <button onClick={() => setDelBed(bedDetail.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">{tc("delete")}</button>
          )}
          <Btn variant="outline" onClick={() => setBedDetail(null)}>{tc("close")}</Btn>
        </>}>
        {bedDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">{bedDetail.wards?.name ?? ta("ward")} · {bedTypeLabel(bedDetail.type)}</p>
                <Pill tone={bedDetail.status === "occupied" ? "bad" : bedDetail.status === "available" ? "ok" : "warn"}>{statusLabel(bedDetail.status)}</Pill>
              </div>
              <button onClick={() => { setEditBedMeta(bedDetail); setBedDetail(null); }} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                <Pencil className="h-3.5 w-3.5" /> {t("editDetails")}
              </button>
            </div>

            {bedDetail.status === "occupied" && bedOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{ta("columns.patient")}</p>
                  <p className="font-semibold text-primary">{bedOccupant.patients?.full_name ?? t("unknown")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageLine(bedOccupant)}
                    {bedOccupant.patients?.gender ?? ""}{bedOccupant.doctors?.name ? ` · ${bedOccupant.doctors.name}` : ""}
                  </p>
                  {bedOccupant.diagnosis && <p className="text-xs text-muted-foreground mt-1">{ta("diagnosisLine", { diagnosis: bedOccupant.diagnosis })}</p>}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(bedOccupant)}><ArrowRightLeft className="h-4 w-4 mr-1.5" /> {ta("transfer")}</Btn>
                  <Btn variant="outline" onClick={() => openDischarge(bedOccupant)}><LogOut className="h-4 w-4 mr-1.5" /> {ta("discharge")}</Btn>
                </div>
              </div>
            ) : bedDetail.status === "available" ? (
              <Btn onClick={() => openAdmit({ bed_id: bedDetail.id, label: `${bedDetail.wards?.name ?? ta("ward")} · ${bedName(bedDetail.number)}` })} className="w-full justify-center">
                {t("admitHere")}
              </Btn>
            ) : (
              <div className="rounded-xl border border-border/60 bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-800 mb-3">{t("sanitizing")}</p>
                <Btn variant="outline" onClick={() => markBedAvailable(bedDetail)}>{t("markAvailable")}</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!delBed} onClose={() => setDelBed(null)} onConfirm={() => { if (delBed) bedsCrud.remove(delBed); }} title={t("removeBed")} description={t("removeBedBody")} />

      {/* ===== Cabin detail / actions ===== */}
      <Modal open={!!cabinDetail} onClose={() => setCabinDetail(null)}
        title={cabinDetail ? cabinName(cabinDetail.number) : ""}
        footer={<>
          {cabinDetail && cabinDetail.status !== "occupied" && (
            <button onClick={() => setDelCabin(cabinDetail.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">{tc("delete")}</button>
          )}
          <Btn variant="outline" onClick={() => setCabinDetail(null)}>{tc("close")}</Btn>
        </>}>
        {cabinDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{cabinCategoryLabel(cabinDetail.category)} · {cabinDetail.floor} · {t("capacityShort", { count: cabinDetail.capacity })}</p>
                <Pill tone={cabinDetail.status === "occupied" ? "bad" : cabinDetail.status === "available" ? "ok" : "warn"}>{statusLabel(cabinDetail.status)}</Pill>
              </div>
              <button onClick={() => { openEditCabinMeta(cabinDetail); setCabinDetail(null); }} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                <Pencil className="h-3.5 w-3.5" /> {t("editDetails")}
              </button>
            </div>

            {cabinDetail.status === "occupied" && cabinOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{ta("columns.patient")}</p>
                  <p className="font-semibold text-primary">{cabinOccupant.patients?.full_name ?? t("unknown")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageLine(cabinOccupant)}
                    {cabinOccupant.patients?.gender ?? ""}{cabinOccupant.doctors?.name ? ` · ${cabinOccupant.doctors.name}` : ""}
                  </p>
                  {cabinOccupant.diagnosis && <p className="text-xs text-muted-foreground mt-1">{ta("diagnosisLine", { diagnosis: cabinOccupant.diagnosis })}</p>}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(cabinOccupant)}><ArrowRightLeft className="h-4 w-4 mr-1.5" /> {ta("transfer")}</Btn>
                  <Btn variant="outline" onClick={() => openDischarge(cabinOccupant)}><LogOut className="h-4 w-4 mr-1.5" /> {ta("discharge")}</Btn>
                </div>
              </div>
            ) : cabinDetail.status === "available" ? (
              <>
                <Btn onClick={() => openAdmit({ cabin_id: cabinDetail.id, label: cabinName(cabinDetail.number) })} className="w-full justify-center">
                  {t("admitHere")}
                </Btn>
                <Field label={t("orSetStatus")}>
                  <Select value={cabinDetail.status} onChange={e => setCabinManualStatus(cabinDetail, e.target.value)}>
                    {CABIN_MANUAL_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </Select>
                </Field>
              </>
            ) : (
              <Field label={ta("columns.status")}>
                <Select value={cabinDetail.status} onChange={e => setCabinManualStatus(cabinDetail, e.target.value)}>
                  {CABIN_MANUAL_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!delCabin} onClose={() => setDelCabin(null)} onConfirm={() => { if (delCabin) cabinsCrud.remove(delCabin); }} title={t("removeCabin")} description={t("removeCabinBody")} />

      {/* ===== Admit modal (shared: bed or cabin) ===== */}
      <Modal open={!!admitTarget} onClose={() => setAdmitTarget(null)} title={t("admitTo", { place: admitTarget?.label ?? "" })} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setAdmitTarget(null)}>{tc("cancel")}</Btn>
          <Btn onClick={submitAdmit}>{ta("admitPatient")}</Btn>
        </>}>
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label={ta("columns.patient")} required>
            <Select value={admitDraft.patient_id} onChange={e => setAdmitDraft(d => ({ ...d, patient_id: e.target.value }))}>
              {patientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label={ta("fields.doctor")}>
            <Select value={admitDraft.doctor_id} onChange={e => setAdmitDraft(d => ({ ...d, doctor_id: e.target.value }))}>
              {doctorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label={ta("columns.diagnosis")}><Input value={admitDraft.diagnosis} onChange={e => setAdmitDraft(d => ({ ...d, diagnosis: e.target.value }))} placeholder={ta("fields.diagnosisPlaceholder")} /></Field>
          <Field label={ta("columns.priority")}>
            <Select value={admitDraft.priority} onChange={e => setAdmitDraft(d => ({ ...d, priority: e.target.value }))}>
              <option value="routine">{ta("priorities.routine")}</option>
              <option value="urgent">{ta("priorities.urgent")}</option>
              <option value="critical">{ta("priorities.critical")}</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* ===== Transfer modal (shared) ===== */}
      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title={ta("transferTitle", { name: transferTarget?.patients?.full_name ?? "" })}
        footer={<>
          <Btn variant="outline" onClick={() => setTransferTarget(null)}>{tc("cancel")}</Btn>
          <Btn onClick={submitTransfer} disabled={!transferChoice.bed_id && !transferChoice.cabin_id}>{ta("movePatient")}</Btn>
        </>}>
        <Field label={ta("fields.moveToBed")}>
          <Select value={transferChoice.bed_id} onChange={e => setTransferChoice({ bed_id: e.target.value, cabin_id: e.target.value ? "" : transferChoice.cabin_id })}>
            <option value="">{ta("noBed")}</option>
            {availableBedsForTransfer.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? ta("ward")} · {bedName(b.number)}</option>)}
          </Select>
        </Field>
        <Field label={ta("fields.moveToCabin")}>
          <Select value={transferChoice.cabin_id} onChange={e => setTransferChoice({ cabin_id: e.target.value, bed_id: e.target.value ? "" : transferChoice.bed_id })}>
            <option value="">{ta("noCabin")}</option>
            {availableCabins.map(c => <option key={c.id} value={c.id}>{cabinName(c.number)} ({cabinCategoryLabel(c.category)})</option>)}
          </Select>
        </Field>
      </Modal>
      <ConfirmDialog open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} onConfirm={confirmDischarge}
        title={dischargeTarget?.patients?.full_name
          ? ta("dischargeTitle", { name: dischargeTarget.patients.full_name })
          : ta("dischargeTitleAnon")}
        description={t("dischargeBody")} />

      {/* ===== Add/Edit bed metadata ===== */}
      <Modal open={addBed || !!editBedMeta} onClose={() => { setAddBed(false); setEditBedMeta(null); }}
        title={editBedMeta ? bedName(editBedMeta.number) : t("addBedTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => { setAddBed(false); setEditBedMeta(null); }}>{tc("cancel")}</Btn>
          <button form="bed-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button>
        </>}>
        <form id="bed-form" onSubmit={e => { e.preventDefault(); saveBedMeta(new FormData(e.currentTarget)); }}>
          <Field label={ta("ward")} required>
            <Select name="ward_id" defaultValue={editBedMeta?.ward_id}>
              {wardsCrud.items.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.bedNumber")} required><Input name="number" defaultValue={editBedMeta?.number} required /></Field>
          <Field label={t("fields.type")}>
            <Select name="type" defaultValue={editBedMeta?.type ?? "general"}>
              {BED_TYPES.map(type => <option key={type} value={type}>{bedTypeLabel(type)}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit cabin metadata ===== */}
      <Modal open={addCabin || !!editCabinMeta} onClose={() => { setAddCabin(false); setEditCabinMeta(null); }}
        title={editCabinMeta ? cabinName(editCabinMeta.number) : t("addCabinTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => { setAddCabin(false); setEditCabinMeta(null); }}>{tc("cancel")}</Btn>
          <button form="cabin-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button>
        </>}>
        <form id="cabin-form" onSubmit={e => { e.preventDefault(); saveCabinMeta(new FormData(e.currentTarget)); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("fields.cabinNumber")} required><Input name="number" defaultValue={editCabinMeta?.number} required /></Field>
            <Field label={t("fields.floor")} required><Input name="floor" defaultValue={editCabinMeta?.floor || "1st Floor"} required /></Field>
            <Field label={t("fields.category")}>
              <Select name="category" defaultValue={editCabinMeta?.category ?? "standard"}>
                {CABIN_CATEGORIES.map(c => <option key={c} value={c}>{cabinCategoryLabel(c)}</option>)}
              </Select>
            </Field>
            <Field label={t("fields.capacity")}><Input name="capacity" type="number" min="1" defaultValue={editCabinMeta?.capacity || 1} /></Field>
            <Field label={t("fields.dailyRate", { symbol: currencySymbol() })}><Input name="daily_rate" type="number" min="0" defaultValue={editCabinMeta?.daily_rate || 0} /></Field>
          </div>
          <Field label={t("fields.amenities")}>
            <div className="flex flex-wrap gap-2">
              {AMENITY_LIST.map(a => {
                const active = amenityDraft.includes(a);
                const Icon = AMENITY_ICON[a];
                return (
                  <button type="button" key={a} onClick={() => toggleAmenity(a)}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {Icon && <Icon className="h-3 w-3" />} {featureLabel(a)}
                  </button>
                );
              })}
            </div>
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit ward pricing ===== */}
      <Modal open={addWard || !!editWard} onClose={() => { setAddWard(false); setEditWard(null); }}
        title={editWard ? t("wardPricingTitle", { name: editWard.name }) : t("addWardTitle")}
        footer={<>
          {editWard && <button onClick={() => setDelWard(editWard.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">{tc("delete")}</button>}
          <Btn variant="outline" onClick={() => { setAddWard(false); setEditWard(null); }}>{tc("cancel")}</Btn>
          <button form="ward-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button>
        </>}>
        <form id="ward-form" onSubmit={e => { e.preventDefault(); saveWard(new FormData(e.currentTarget)); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("fields.wardName")} required><Input name="name" defaultValue={editWard?.name} required placeholder={t("fields.wardNamePlaceholder")} /></Field>
            <Field label={t("fields.category")}>
              <Select name="category" defaultValue={editWard?.category ?? "general"}>
                {WARD_CATEGORIES.map(c => <option key={c} value={c}>{wardCategoryLabel(c)}</option>)}
              </Select>
            </Field>
            <Field label={t("fields.dailyRate", { symbol: currencySymbol() })} required><Input name="daily_rate" type="number" min="0" defaultValue={editWard?.daily_rate || 0} required /></Field>
            <Field label={t("fields.nursingCharge", { symbol: currencySymbol() })}><Input name="nursing_charge" type="number" min="0" defaultValue={editWard?.nursing_charge || 0} /></Field>
          </div>
          <Field label={t("fields.facilities")}>
            <div className="flex flex-wrap gap-2">
              {WARD_FACILITY_LIST.map(f => {
                const active = facDraft.includes(f);
                return (
                  <button type="button" key={f} onClick={() => toggleFac(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {featureLabel(f)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("fields.notes")}><Input name="notes" defaultValue={editWard?.notes ?? ""} placeholder={t("fields.notesPlaceholder")} /></Field>
        </form>
      </Modal>
      <ConfirmDialog open={!!delWard} onClose={() => setDelWard(null)} onConfirm={() => { if (delWard) wardsCrud.remove(delWard); setEditWard(null); }} title={t("removeWard")} description={t("removeWardBody")} />
    </AdminLayout>
  );
};
export default Wards;
