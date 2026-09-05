"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, Chips, ConfirmDialog } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useAdmitPatient } from "@/components/admin/useAdmitPatient";
import { useNotifications } from "@/components/admin/NotificationProvider";
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

const WARD_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "semi_private", label: "Semi-Private" },
  { value: "icu", label: "ICU" },
  { value: "maternity", label: "Maternity" },
  { value: "pediatric", label: "Pediatric" },
] as const;
const wardCategoryLabel = (v: string) => WARD_CATEGORIES.find(c => c.value === v)?.label ?? v;
const wardCategoryTone: Record<string, string> = {
  general: "bg-primary text-primary-foreground",
  semi_private: "bg-primary-glow text-primary-foreground",
  icu: "bg-destructive text-destructive-foreground",
  maternity: "bg-accent text-accent-foreground",
  pediatric: "bg-secondary text-secondary-foreground",
};

const BED_TYPES = [
  { value: "general", label: "General" },
  { value: "icu", label: "ICU" },
  { value: "cabin", label: "Cabin" },
] as const;

const BED_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "cleaning", label: "Cleaning" },
] as const;

const CABIN_CATEGORIES = [
  { value: "standard", label: "Standard" },
  { value: "deluxe", label: "Deluxe" },
  { value: "premium", label: "Premium" },
  { value: "suite", label: "Suite" },
] as const;
const cabinCategoryLabel = (v: string) => CABIN_CATEGORIES.find(c => c.value === v)?.label ?? v;

const CABIN_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
] as const;

/** Never "occupied" here — that only ever comes from a real bed_stays row. */
const CABIN_MANUAL_STATUSES = CABIN_STATUS_FILTERS.filter(s => s.value !== "all" && s.value !== "occupied");

const cabinStatusLabel = (v: string) => CABIN_STATUS_FILTERS.find(c => c.value === v)?.label ?? v;
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

const ageFromDob = (dob: string | null | undefined) => {
  if (!dob) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)));
};

type AdmitTarget = { bed_id?: string; cabin_id?: string; label: string };
type AdmitDraft = { patient_id: string; doctor_id: string; diagnosis: string; priority: string; notes: string };
const emptyAdmitDraft: AdmitDraft = { patient_id: "", doctor_id: "", diagnosis: "", priority: "routine", notes: "" };

const Wards = () => {
  const wardsCrud = useResourceCrud<WardRow>("wards");
  const bedsCrud = useResourceCrud<BedRow>("beds");
  const cabinsCrud = useResourceCrud<CabinRow>("cabins");
  const { push } = useNotifications();
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
    { value: "", label: patientsLoading ? "Loading patients…" : "— Select a patient —" },
    ...patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.mrn})` })),
  ], [patients, patientsLoading]);

  const { data: doctorsData, isLoading: doctorsLoading } = doctorsApi.useList({ limit: 100 });
  const doctors = useMemo(() => doctorsData?.data ?? [], [doctorsData]);
  const doctorOptions = useMemo(() => [
    { value: "", label: doctorsLoading ? "Loading doctors…" : "— Not assigned —" },
    ...doctors.map(d => ({ value: d.id, label: d.specialty ? `${d.name} · ${d.specialty}` : d.name })),
  ], [doctors, doctorsLoading]);

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
      push({ title: "Transferred", body: `${transferTarget.patients?.full_name ?? "Patient"} moved`, tone: "ok" });
      setTransferTarget(null);
    } catch {
      push({ title: "Transfer failed", body: "The bed/cabin may already be occupied", tone: "bad" });
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
      push({ title: "Could not release the bed", body: "Nothing was changed — try again", tone: "bad" });
      setDischargeTarget(null);
      return;
    }
    try {
      await updateAdmission(dischargeTarget.id, { status: "discharged", discharged_at: new Date().toISOString() }).unwrap();
      push({ title: "Discharged", body: `${dischargeTarget.patients?.full_name ?? "Patient"} discharged`, tone: "ok" });
    } catch {
      push({ title: "Bed released, but the discharge did not save", body: "Set the status to Discharged from the Admissions page", tone: "warn" });
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
    <AdminLayout title="Ward / Bed / Cabin Management" subtitle="Live bed status with admit/transfer/discharge workflows">
      {/* ===== Bed KPI Strip ===== */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-border/60">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TOTAL BEDS</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="font-display text-4xl text-primary">{bedsCrud.items.length}</p>
            <span className="text-[11px] font-semibold text-muted-foreground">across {wardsCrud.items.length} wards</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${occupancyPct}%` }} />
          </div>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-[10px] tracking-widest font-bold text-destructive">OCCUPIED</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-destructive">{occupiedBeds}</p>
            <span className="text-xs font-semibold text-destructive/70">{occupancyPct}% capacity</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Live patient count</p>
        </Card>
        <Card className="p-5 border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-primary-glow">AVAILABLE</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-primary-glow">{availableBeds}</p>
            <span className="text-xs font-semibold text-primary-glow/80">Ready for admission</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Updated just now</p>
        </Card>
      </div>

      {/* ===== Floor Map ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title="Floor Map" action={<div className="flex items-center gap-2 flex-wrap">
          <Chips value={bedFilter} onChange={setBedFilter} options={BED_STATUS_FILTERS as unknown as { value: string; label: string }[]} />
          <Btn onClick={() => setAddBed(true)}>+ Add Bed</Btn>
        </div>} />

        {bedsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">Could not load beds.</p>
        ) : bedsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
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
                      <span className="text-sm font-bold text-foreground">₹{w.daily_rate.toLocaleString()}<span className="text-[11px] font-medium text-muted-foreground">/day</span></span>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5">
                        {wardOcc}/{wardTotal} occupied
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {w.facilities.slice(0, 3).map(f => (
                          <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">{f}</span>
                        ))}
                        {w.facilities.length > 3 && <span className="text-[10px] px-2 py-0.5 text-muted-foreground font-bold">+{w.facilities.length - 3}</span>}
                      </div>
                    </div>
                    <button onClick={() => openEditWard(w)} className="text-[11px] text-primary font-bold underline underline-offset-4 hover:text-primary-glow">
                      Edit pricing & facilities
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                    {wardBeds.map(b => {
                      const occ = occupantByBed.get(b.id);
                      return (
                        <button key={b.id} onClick={() => setBedDetail(b)} title={occ?.patients?.full_name || b.status}
                          className={`aspect-square rounded-xl border-2 grid place-items-center text-[10px] font-bold p-1 transition hover:shadow-md hover:-translate-y-0.5
                            ${b.status === "occupied" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                              b.status === "available" ? "bg-accent/30 border-accent text-accent-foreground" :
                              "bg-yellow-100 border-yellow-300 text-yellow-800"}`}>
                          <Bed className="h-4 w-4" />
                          <span className="mt-0.5">{b.number}</span>
                        </button>
                      );
                    })}
                    {!wardBeds.length && <p className="col-span-full text-xs text-muted-foreground py-2">No beds match the filter in this ward.</p>}
                  </div>
                </div>
              );
            })}
            {!wardsCrud.items.length && <p className="text-sm text-muted-foreground py-6 text-center">No wards configured yet — add one below.</p>}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-5 text-[11px] font-semibold text-muted-foreground border-t border-border pt-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Occupied</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent" /> Available</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Cleaning</div>
        </div>
      </Card>

      {/* ===== Ward Pricing & Facilities ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title="Ward Pricing & Facilities" action={<Btn onClick={openAddWard}>+ Add Ward</Btn>} />
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
                <span className="font-display text-3xl text-foreground">₹{w.daily_rate.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ day</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">+ ₹{w.nursing_charge.toLocaleString()} nursing charge</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {w.facilities.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/80 font-medium">{f}</span>
                ))}
              </div>
              {w.notes && <p className="text-[11px] text-muted-foreground italic mt-4 pt-3 border-t border-border">{w.notes}</p>}
            </button>
          ))}
          {!wardsCrud.items.length && <p className="text-sm text-muted-foreground py-6 col-span-full text-center">No ward pricing configured yet.</p>}
        </div>
      </Card>

      {/* ===== Private Cabin KPI Strip ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 bg-primary text-primary-foreground border-primary">
          <p className="text-[10px] tracking-widest font-bold opacity-80">TOTAL CABINS</p>
          <p className="font-display text-4xl mt-2">{cabinsCrud.items.length}</p>
          <p className="text-[11px] opacity-70 mt-3">Across {floors.length} floors</p>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-[10px] tracking-widest font-bold text-destructive">OCCUPIED</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-destructive">{cabOccupied}</p>
            <span className="text-xs font-semibold text-destructive/70">({cabOccupancyRate}%)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Active stays</p>
        </Card>
        <Card className="p-5 border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-primary-glow">AVAILABLE</p>
          <p className="font-display text-4xl text-primary-glow mt-2">{cabAvailable}</p>
          <p className="text-[11px] text-muted-foreground mt-3">Ready to book</p>
        </Card>
        <Card className="p-5 bg-primary-glow text-primary-foreground border-primary-glow">
          <p className="text-[10px] tracking-widest font-bold opacity-80">DAILY REVENUE</p>
          <p className="font-display text-4xl mt-2">₹{cabRevenue.toLocaleString()}</p>
          <p className="text-[11px] opacity-70 mt-3">From occupied cabins</p>
        </Card>
      </div>

      {/* ===== Private Cabin Management ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title="Private Cabin Management" action={<div className="flex items-center gap-2 flex-wrap">
          <Chips value={cabFilter} onChange={setCabFilter} options={CABIN_STATUS_FILTERS as unknown as { value: string; label: string }[]} />
          <Btn onClick={openAddCabin}>+ Add Cabin</Btn>
        </div>} />

        {cabinsCrud.error ? (
          <p className="text-sm text-destructive py-6 text-center">Could not load cabins.</p>
        ) : cabinsCrud.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
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
                                <Users className="h-3 w-3" /> Cap: {c.capacity}
                                <span>•</span>
                                <span className="font-bold text-foreground">₹{c.daily_rate.toLocaleString()}/day</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${cabinStatusBg[c.status] ?? ""}`}>{cabinStatusLabel(c.status)}</span>
                          </div>
                          {occ ? (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/60">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Patient</p>
                              <p className="text-sm font-bold text-foreground">{occ.patients?.full_name ?? "Unknown"}</p>
                              {occ.doctors?.name && <p className="text-[11px] text-muted-foreground mt-0.5">Doctor: {occ.doctors.name}</p>}
                            </div>
                          ) : (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/40">
                              <p className="text-[11px] text-muted-foreground italic">
                                {c.status === "available" ? "Ready for check-in" : c.status === "reserved" ? (c.admitted_on ? `Reserved for ${c.admitted_on}` : "Reserved") : c.status === "cleaning" ? "Sanitization in progress" : "Out of service"}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                            {c.amenities.map(a => {
                              const Icon = AMENITY_ICON[a];
                              return (
                                <span key={a} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground font-medium">
                                  {Icon && <Icon className="h-2.5 w-2.5" />} {a}
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
            {!cabinList.length && <p className="text-sm text-muted-foreground text-center py-6">No cabins match the selected filter.</p>}
          </div>
        )}
      </Card>

      {/* ===== Bed detail / actions ===== */}
      <Modal open={!!bedDetail} onClose={() => setBedDetail(null)}
        title={bedDetail ? `Bed ${bedDetail.number}` : ""}
        footer={<>
          {bedDetail && bedDetail.status !== "occupied" && (
            <button onClick={() => setDelBed(bedDetail.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>
          )}
          <Btn variant="outline" onClick={() => setBedDetail(null)}>Close</Btn>
        </>}>
        {bedDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{bedDetail.wards?.name ?? "Ward"} · {bedDetail.type.toUpperCase()}</p>
                <Pill tone={bedDetail.status === "occupied" ? "bad" : bedDetail.status === "available" ? "ok" : "warn"}>{bedDetail.status}</Pill>
              </div>
              <button onClick={() => { setEditBedMeta(bedDetail); setBedDetail(null); }} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </button>
            </div>

            {bedDetail.status === "occupied" && bedOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Patient</p>
                  <p className="font-semibold text-primary">{bedOccupant.patients?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageFromDob(bedOccupant.patients?.date_of_birth) !== null ? `${ageFromDob(bedOccupant.patients?.date_of_birth)}y · ` : ""}
                    {bedOccupant.patients?.gender ?? ""}{bedOccupant.doctors?.name ? ` · ${bedOccupant.doctors.name}` : ""}
                  </p>
                  {bedOccupant.diagnosis && <p className="text-xs text-muted-foreground mt-1">Diagnosis: {bedOccupant.diagnosis}</p>}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(bedOccupant)}><ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer</Btn>
                  <Btn variant="outline" onClick={() => openDischarge(bedOccupant)}><LogOut className="h-4 w-4 mr-1.5" /> Discharge</Btn>
                </div>
              </div>
            ) : bedDetail.status === "available" ? (
              <Btn onClick={() => openAdmit({ bed_id: bedDetail.id, label: `${bedDetail.wards?.name ?? "Ward"} · Bed ${bedDetail.number}` })} className="w-full justify-center">
                Admit Patient Here
              </Btn>
            ) : (
              <div className="rounded-xl border border-border/60 bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-800 mb-3">Sanitization in progress.</p>
                <Btn variant="outline" onClick={() => markBedAvailable(bedDetail)}>Mark Available</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!delBed} onClose={() => setDelBed(null)} onConfirm={() => { if (delBed) bedsCrud.remove(delBed); }} title="Remove bed?" description="This permanently removes the bed from inventory." />

      {/* ===== Cabin detail / actions ===== */}
      <Modal open={!!cabinDetail} onClose={() => setCabinDetail(null)}
        title={cabinDetail ? `Cabin ${cabinDetail.number}` : ""}
        footer={<>
          {cabinDetail && cabinDetail.status !== "occupied" && (
            <button onClick={() => setDelCabin(cabinDetail.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>
          )}
          <Btn variant="outline" onClick={() => setCabinDetail(null)}>Close</Btn>
        </>}>
        {cabinDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{cabinCategoryLabel(cabinDetail.category)} · {cabinDetail.floor} · Cap {cabinDetail.capacity}</p>
                <Pill tone={cabinDetail.status === "occupied" ? "bad" : cabinDetail.status === "available" ? "ok" : "warn"}>{cabinStatusLabel(cabinDetail.status)}</Pill>
              </div>
              <button onClick={() => { openEditCabinMeta(cabinDetail); setCabinDetail(null); }} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </button>
            </div>

            {cabinDetail.status === "occupied" && cabinOccupant ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Patient</p>
                  <p className="font-semibold text-primary">{cabinOccupant.patients?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {ageFromDob(cabinOccupant.patients?.date_of_birth) !== null ? `${ageFromDob(cabinOccupant.patients?.date_of_birth)}y · ` : ""}
                    {cabinOccupant.patients?.gender ?? ""}{cabinOccupant.doctors?.name ? ` · ${cabinOccupant.doctors.name}` : ""}
                  </p>
                  {cabinOccupant.diagnosis && <p className="text-xs text-muted-foreground mt-1">Diagnosis: {cabinOccupant.diagnosis}</p>}
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => openTransfer(cabinOccupant)}><ArrowRightLeft className="h-4 w-4 mr-1.5" /> Transfer</Btn>
                  <Btn variant="outline" onClick={() => openDischarge(cabinOccupant)}><LogOut className="h-4 w-4 mr-1.5" /> Discharge</Btn>
                </div>
              </div>
            ) : cabinDetail.status === "available" ? (
              <>
                <Btn onClick={() => openAdmit({ cabin_id: cabinDetail.id, label: `Cabin ${cabinDetail.number}` })} className="w-full justify-center">
                  Admit Patient Here
                </Btn>
                <Field label="Or set status">
                  <Select value={cabinDetail.status} onChange={e => setCabinManualStatus(cabinDetail, e.target.value)}>
                    {CABIN_MANUAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Field>
              </>
            ) : (
              <Field label="Status">
                <Select value={cabinDetail.status} onChange={e => setCabinManualStatus(cabinDetail, e.target.value)}>
                  {CABIN_MANUAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!delCabin} onClose={() => setDelCabin(null)} onConfirm={() => { if (delCabin) cabinsCrud.remove(delCabin); }} title="Remove cabin?" description="This permanently removes the cabin." />

      {/* ===== Admit modal (shared: bed or cabin) ===== */}
      <Modal open={!!admitTarget} onClose={() => setAdmitTarget(null)} title={`Admit to ${admitTarget?.label ?? ""}`} size="lg"
        footer={<>
          <Btn variant="outline" onClick={() => setAdmitTarget(null)}>Cancel</Btn>
          <Btn onClick={submitAdmit}>Admit Patient</Btn>
        </>}>
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Patient" required>
            <Select value={admitDraft.patient_id} onChange={e => setAdmitDraft(d => ({ ...d, patient_id: e.target.value }))}>
              {patientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Attending doctor">
            <Select value={admitDraft.doctor_id} onChange={e => setAdmitDraft(d => ({ ...d, doctor_id: e.target.value }))}>
              {doctorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Diagnosis"><Input value={admitDraft.diagnosis} onChange={e => setAdmitDraft(d => ({ ...d, diagnosis: e.target.value }))} placeholder="Reason for admission" /></Field>
          <Field label="Priority">
            <Select value={admitDraft.priority} onChange={e => setAdmitDraft(d => ({ ...d, priority: e.target.value }))}>
              <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="critical">Critical</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* ===== Transfer modal (shared) ===== */}
      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title={`Transfer ${transferTarget?.patients?.full_name ?? ""}`}
        footer={<>
          <Btn variant="outline" onClick={() => setTransferTarget(null)}>Cancel</Btn>
          <Btn onClick={submitTransfer} disabled={!transferChoice.bed_id && !transferChoice.cabin_id}>Move patient</Btn>
        </>}>
        <Field label="Move to bed">
          <Select value={transferChoice.bed_id} onChange={e => setTransferChoice({ bed_id: e.target.value, cabin_id: e.target.value ? "" : transferChoice.cabin_id })}>
            <option value="">— No bed —</option>
            {availableBedsForTransfer.map(b => <option key={b.id} value={b.id}>{b.wards?.name ?? "Ward"} · Bed {b.number}</option>)}
          </Select>
        </Field>
        <Field label="Move to cabin">
          <Select value={transferChoice.cabin_id} onChange={e => setTransferChoice({ cabin_id: e.target.value, bed_id: e.target.value ? "" : transferChoice.bed_id })}>
            <option value="">— No cabin —</option>
            {availableCabins.map(c => <option key={c.id} value={c.id}>Cabin {c.number} ({cabinCategoryLabel(c.category)})</option>)}
          </Select>
        </Field>
      </Modal>
      <ConfirmDialog open={!!dischargeTarget} onClose={() => setDischargeTarget(null)} onConfirm={confirmDischarge}
        title={`Discharge ${dischargeTarget?.patients?.full_name ?? "this patient"}?`}
        description="The bed/cabin will be released and marked for cleaning." />

      {/* ===== Add/Edit bed metadata ===== */}
      <Modal open={addBed || !!editBedMeta} onClose={() => { setAddBed(false); setEditBedMeta(null); }}
        title={editBedMeta ? `Bed ${editBedMeta.number}` : "Add bed"}
        footer={<>
          <Btn variant="outline" onClick={() => { setAddBed(false); setEditBedMeta(null); }}>Cancel</Btn>
          <button form="bed-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="bed-form" onSubmit={e => { e.preventDefault(); saveBedMeta(new FormData(e.currentTarget)); }}>
          <Field label="Ward" required>
            <Select name="ward_id" defaultValue={editBedMeta?.ward_id}>
              {wardsCrud.items.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </Field>
          <Field label="Bed Number" required><Input name="number" defaultValue={editBedMeta?.number} required /></Field>
          <Field label="Type">
            <Select name="type" defaultValue={editBedMeta?.type ?? "general"}>
              {BED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit cabin metadata ===== */}
      <Modal open={addCabin || !!editCabinMeta} onClose={() => { setAddCabin(false); setEditCabinMeta(null); }}
        title={editCabinMeta ? `Cabin ${editCabinMeta.number}` : "Add cabin"}
        footer={<>
          <Btn variant="outline" onClick={() => { setAddCabin(false); setEditCabinMeta(null); }}>Cancel</Btn>
          <button form="cabin-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="cabin-form" onSubmit={e => { e.preventDefault(); saveCabinMeta(new FormData(e.currentTarget)); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cabin Number" required><Input name="number" defaultValue={editCabinMeta?.number} required /></Field>
            <Field label="Floor" required><Input name="floor" defaultValue={editCabinMeta?.floor || "1st Floor"} required /></Field>
            <Field label="Category">
              <Select name="category" defaultValue={editCabinMeta?.category ?? "standard"}>
                {CABIN_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Capacity"><Input name="capacity" type="number" min="1" defaultValue={editCabinMeta?.capacity || 1} /></Field>
            <Field label="Daily Rate (₹)"><Input name="daily_rate" type="number" min="0" defaultValue={editCabinMeta?.daily_rate || 0} /></Field>
          </div>
          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITY_LIST.map(a => {
                const active = amenityDraft.includes(a);
                const Icon = AMENITY_ICON[a];
                return (
                  <button type="button" key={a} onClick={() => toggleAmenity(a)}
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {Icon && <Icon className="h-3 w-3" />} {a}
                  </button>
                );
              })}
            </div>
          </Field>
        </form>
      </Modal>

      {/* ===== Add/Edit ward pricing ===== */}
      <Modal open={addWard || !!editWard} onClose={() => { setAddWard(false); setEditWard(null); }}
        title={editWard ? `${editWard.name} — Pricing & Facilities` : "Add ward"}
        footer={<>
          {editWard && <button onClick={() => setDelWard(editWard.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>}
          <Btn variant="outline" onClick={() => { setAddWard(false); setEditWard(null); }}>Cancel</Btn>
          <button form="ward-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="ward-form" onSubmit={e => { e.preventDefault(); saveWard(new FormData(e.currentTarget)); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ward Name" required><Input name="name" defaultValue={editWard?.name} required placeholder="e.g. Ward 3B / ICU / Maternity" /></Field>
            <Field label="Category">
              <Select name="category" defaultValue={editWard?.category ?? "general"}>
                {WARD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Daily Rate (₹)" required><Input name="daily_rate" type="number" min="0" defaultValue={editWard?.daily_rate || 0} required /></Field>
            <Field label="Nursing Charge (₹/day)"><Input name="nursing_charge" type="number" min="0" defaultValue={editWard?.nursing_charge || 0} /></Field>
          </div>
          <Field label="Facilities">
            <div className="flex flex-wrap gap-2">
              {WARD_FACILITY_LIST.map(f => {
                const active = facDraft.includes(f);
                return (
                  <button type="button" key={f} onClick={() => toggleFac(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border-2 transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notes"><Input name="notes" defaultValue={editWard?.notes ?? ""} placeholder="Optional notes" /></Field>
        </form>
      </Modal>
      <ConfirmDialog open={!!delWard} onClose={() => setDelWard(null)} onConfirm={() => { if (delWard) wardsCrud.remove(delWard); setEditWard(null); }} title="Remove ward?" description="Beds in this ward must be reassigned or removed first." />
    </AdminLayout>
  );
};
export default Wards;
