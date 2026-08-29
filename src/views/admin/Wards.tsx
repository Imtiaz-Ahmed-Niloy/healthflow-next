"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { useCrud, Modal, Field, Input, Select, Chips, statusTone, ConfirmDialog } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { Bed, Home, Wifi, Tv, Wind, Coffee, Bath, Users } from "lucide-react";

type BedRow = { id: string; ward: string; number: string; type: string; patient: string; status: string };
const seed: BedRow[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `w1-${i}`, ward: "Ward 3B", number: `301-${i + 1}`, type: "General", patient: i % 3 === 0 ? "Aisha B." : i % 3 === 1 ? "" : "John D.", status: i % 3 === 0 ? "Occupied" : i % 3 === 1 ? "Available" : "Occupied" })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `icu-${i}`, ward: "ICU", number: `ICU-${i + 1}`, type: "ICU", patient: i % 2 === 0 ? "Robert L." : "", status: i % 2 === 0 ? "Occupied" : "Available" })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `mat-${i}`, ward: "Maternity", number: `MAT-${i + 1}`, type: "Cabin", patient: "", status: "Cleaning" })),
];

type CabinRow = {
  id: string;
  number: string;
  category: "Deluxe" | "Premium" | "Standard" | "Suite";
  floor: string;
  capacity: number;
  rate: number;
  amenities: string[];
  patient: string;
  attendant: string;
  admittedOn: string;
  status: "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Reserved";
};

const AMENITY_LIST = ["WiFi", "TV", "AC", "Mini Fridge", "Attached Bath", "Sofa Bed"];
const AMENITY_ICON: Record<string, typeof Wifi> = { WiFi: Wifi, TV: Tv, AC: Wind, "Mini Fridge": Coffee, "Attached Bath": Bath, "Sofa Bed": Users };

const WARD_FACILITY_LIST = ["AC", "WiFi", "TV", "Attached Bath", "Shared Bath", "Oxygen Supply", "Ventilator", "Nurse Call", "Cardiac Monitor", "Visitor Chair", "Locker", "Meals Included"];
type WardConfigRow = {
  id: string;
  ward: string;
  category: "General" | "Semi-Private" | "ICU" | "Maternity" | "Pediatric";
  rate: number;
  nursingCharge: number;
  facilities: string[];
  notes: string;
};
const wardConfigSeed: WardConfigRow[] = [
  { id: "wc-1", ward: "Ward 3B", category: "General", rate: 1200, nursingCharge: 300, facilities: ["AC", "Shared Bath", "Nurse Call", "Visitor Chair", "Meals Included"], notes: "8-bed general ward" },
  { id: "wc-2", ward: "ICU", category: "ICU", rate: 5500, nursingCharge: 1500, facilities: ["AC", "Oxygen Supply", "Ventilator", "Cardiac Monitor", "Nurse Call"], notes: "24x7 intensivist coverage" },
  { id: "wc-3", ward: "Maternity", category: "Maternity", rate: 2800, nursingCharge: 600, facilities: ["AC", "Attached Bath", "TV", "Nurse Call", "Visitor Chair", "Meals Included"], notes: "Includes newborn cot" },
];

const cabinSeed: CabinRow[] = [
  { id: "cab-1", number: "C-101", category: "Deluxe", floor: "1st Floor", capacity: 2, rate: 4500, amenities: ["WiFi", "TV", "AC", "Attached Bath"], patient: "Priya S.", attendant: "Rohit S.", admittedOn: "2026-05-20", status: "Occupied" },
  { id: "cab-2", number: "C-102", category: "Premium", floor: "1st Floor", capacity: 2, rate: 6500, amenities: ["WiFi", "TV", "AC", "Mini Fridge", "Attached Bath", "Sofa Bed"], patient: "", attendant: "", admittedOn: "", status: "Available" },
  { id: "cab-3", number: "C-201", category: "Suite", floor: "2nd Floor", capacity: 3, rate: 9500, amenities: ["WiFi", "TV", "AC", "Mini Fridge", "Attached Bath", "Sofa Bed"], patient: "Mr. Khan", attendant: "Mrs. Khan", admittedOn: "2026-05-18", status: "Occupied" },
  { id: "cab-4", number: "C-202", category: "Standard", floor: "2nd Floor", capacity: 1, rate: 3000, amenities: ["WiFi", "AC", "Attached Bath"], patient: "", attendant: "", admittedOn: "", status: "Cleaning" },
  { id: "cab-5", number: "C-203", category: "Deluxe", floor: "2nd Floor", capacity: 2, rate: 4500, amenities: ["WiFi", "TV", "AC", "Attached Bath"], patient: "", attendant: "", admittedOn: "2026-05-25", status: "Reserved" },
  { id: "cab-6", number: "C-301", category: "Premium", floor: "3rd Floor", capacity: 2, rate: 6500, amenities: ["WiFi", "TV", "AC", "Mini Fridge", "Attached Bath"], patient: "", attendant: "", admittedOn: "", status: "Maintenance" },
];

const cabinTone: Record<string, string> = {
  Available: "bg-accent/30 border-accent text-accent-foreground",
  Occupied: "bg-destructive/10 border-destructive/40 text-destructive",
  Cleaning: "bg-yellow-100 border-yellow-300 text-yellow-800",
  Maintenance: "bg-orange-100 border-orange-300 text-orange-800",
  Reserved: "bg-blue-100 border-blue-300 text-blue-800",
};

const Wards = () => {
  const crud = useCrud<BedRow>("beds", seed);
  const cabins = useCrud<CabinRow>("cabins", cabinSeed);
  const { push } = useNotifications();
  const [filter, setFilter] = useState<"all" | "Occupied" | "Available" | "Cleaning">("all");
  const [edit, setEdit] = useState<BedRow | null>(null);
  const [add, setAdd] = useState(false);
  const [del, setDel] = useState<string | null>(null);

  const [cabFilter, setCabFilter] = useState<string>("all");
  const [editCab, setEditCab] = useState<CabinRow | null>(null);
  const [addCab, setAddCab] = useState(false);
  const [delCab, setDelCab] = useState<string | null>(null);
  const [amenityDraft, setAmenityDraft] = useState<string[]>([]);

  const wardConfigs = useCrud<WardConfigRow>("ward-configs", wardConfigSeed);
  const [editWc, setEditWc] = useState<WardConfigRow | null>(null);
  const [addWc, setAddWc] = useState(false);
  const [delWc, setDelWc] = useState<string | null>(null);
  const [facDraft, setFacDraft] = useState<string[]>([]);
  const openEditWc = (w: WardConfigRow) => { setEditWc(w); setFacDraft(w.facilities); };
  const openAddWc = () => { setAddWc(true); setFacDraft([]); };
  const toggleFac = (f: string) => setFacDraft(d => d.includes(f) ? d.filter(x => x !== f) : [...d, f]);

  const wards = Array.from(new Set(crud.items.map(b => b.ward)));
  const list = filter === "all" ? crud.items : crud.items.filter(b => b.status === filter);
  const occupied = crud.items.filter(b => b.status === "Occupied").length;
  const available = crud.items.filter(b => b.status === "Available").length;
  const wardConfigFor = (w: string) => wardConfigs.items.find(c => c.ward === w);

  const cabinList = cabFilter === "all" ? cabins.items : cabins.items.filter(c => c.status === cabFilter || c.category === cabFilter);
  const floors = Array.from(new Set(cabins.items.map(c => c.floor)));
  const cabOccupied = cabins.items.filter(c => c.status === "Occupied").length;
  const cabAvailable = cabins.items.filter(c => c.status === "Available").length;
  const cabRevenue = cabins.items.filter(c => c.status === "Occupied").reduce((s, c) => s + c.rate, 0);
  const cabOccupancyRate = cabins.items.length ? Math.round((cabOccupied / cabins.items.length) * 100) : 0;

  const openEditCab = (c: CabinRow) => { setEditCab(c); setAmenityDraft(c.amenities); };
  const openAddCab = () => { setAddCab(true); setAmenityDraft([]); };
  const toggleAmenity = (a: string) => setAmenityDraft(d => d.includes(a) ? d.filter(x => x !== a) : [...d, a]);

  const occupancyPct = crud.items.length ? Math.round((occupied / crud.items.length) * 100) : 0;
  const wardCategoryTone: Record<string, string> = {
    General: "bg-primary text-primary-foreground",
    "Semi-Private": "bg-primary-glow text-primary-foreground",
    ICU: "bg-destructive text-destructive-foreground",
    Maternity: "bg-accent text-accent-foreground",
    Pediatric: "bg-secondary text-secondary-foreground",
  };

  return (
    <AdminLayout title="Ward / Bed / Cabin Management" subtitle="Live bed status with admit/discharge workflows">
      {/* ===== Bed KPI Strip ===== */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-border/60">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TOTAL BEDS</p>
          <div className="flex items-baseline justify-between mt-2">
            <p className="font-display text-4xl text-primary">{crud.items.length}</p>
            <span className="text-[11px] font-semibold text-muted-foreground">across {wards.length} units</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${occupancyPct}%` }} />
          </div>
        </Card>
        <Card className="p-5 border-destructive/20">
          <p className="text-[10px] tracking-widest font-bold text-destructive">OCCUPIED</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-destructive">{occupied}</p>
            <span className="text-xs font-semibold text-destructive/70">{occupancyPct}% capacity</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Live patient count</p>
        </Card>
        <Card className="p-5 border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-primary-glow">AVAILABLE</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-display text-4xl text-primary-glow">{available}</p>
            <span className="text-xs font-semibold text-primary-glow/80">Ready for admission</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Updated just now</p>
        </Card>
      </div>

      {/* ===== Floor Map ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title="Floor Map" action={<div className="flex items-center gap-2 flex-wrap">
          <Chips value={filter} onChange={(v) => setFilter(v as never)} options={[{ value: "all", label: "All" }, { value: "Available", label: "Available" }, { value: "Occupied", label: "Occupied" }, { value: "Cleaning", label: "Cleaning" }]} />
          <Btn onClick={() => setAdd(true)}>+ Add Bed</Btn>
        </div>} />

        <div className="space-y-6 mt-2">
          {wards.map(w => {
            const wc = wardConfigFor(w);
            const wardBeds = list.filter(b => b.ward === w);
            const wardOcc = crud.items.filter(b => b.ward === w && b.status === "Occupied").length;
            const wardTotal = crud.items.filter(b => b.ward === w).length;
            return (
              <div key={w} className="rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display text-xl text-primary">{w}</h3>
                    {wc && <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${wardCategoryTone[wc.category] ?? "bg-primary text-primary-foreground"}`}>{wc.category}</span>}
                    {wc && <span className="text-sm font-bold text-foreground">₹{wc.rate.toLocaleString()}<span className="text-[11px] font-medium text-muted-foreground">/day</span></span>}
                    <span className="text-[11px] font-semibold text-muted-foreground bg-card border border-border rounded-full px-2 py-0.5">
                      {wardOcc}/{wardTotal} occupied
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {wc?.facilities.slice(0, 3).map(f => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">{f}</span>
                      ))}
                      {wc && wc.facilities.length > 3 && <span className="text-[10px] px-2 py-0.5 text-muted-foreground font-bold">+{wc.facilities.length - 3}</span>}
                    </div>
                  </div>
                  <button onClick={() => wc ? openEditWc(wc) : openAddWc()} className="text-[11px] text-primary font-bold underline underline-offset-4 hover:text-primary-glow">
                    {wc ? "Edit pricing & facilities" : "+ Set pricing"}
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
                  {wardBeds.map(b => (
                    <button key={b.id} onClick={() => setEdit(b)} title={b.patient || b.status}
                      className={`aspect-square rounded-xl border-2 grid place-items-center text-[10px] font-bold p-1 transition hover:shadow-md hover:-translate-y-0.5
                        ${b.status === "Occupied" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                          b.status === "Available" ? "bg-accent/30 border-accent text-accent-foreground" :
                          "bg-yellow-100 border-yellow-300 text-yellow-800"}`}>
                      <Bed className="h-4 w-4" />
                      <span className="mt-0.5">{b.number}</span>
                    </button>
                  ))}
                  {!wardBeds.length && <p className="col-span-full text-xs text-muted-foreground py-2">No beds match the filter in this ward.</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-5 text-[11px] font-semibold text-muted-foreground border-t border-border pt-4">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-destructive" /> Occupied</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent" /> Available</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Cleaning</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> Reserved</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> Maintenance</div>
        </div>
      </Card>

      {/* ===== Ward Pricing & Facilities ===== */}
      <Card className="p-6 mb-8 shadow-soft">
        <SectionTitle title="Ward Pricing & Facilities" action={<Btn onClick={openAddWc}>+ Add Ward Config</Btn>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {wardConfigs.items.map(w => (
            <button key={w.id} onClick={() => openEditWc(w)} className="text-left rounded-2xl border border-border bg-card p-5 hover:shadow-card hover:border-primary/50 hover:-translate-y-0.5 transition group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-accent/30 group-hover:bg-accent/50 transition">
                  <Bed className="h-5 w-5 text-primary" />
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${wardCategoryTone[w.category] ?? "bg-primary text-primary-foreground"}`}>{w.category}</span>
              </div>
              <h4 className="font-display text-lg text-primary">{w.ward}</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-display text-3xl text-foreground">₹{w.rate.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ day</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">+ ₹{w.nursingCharge.toLocaleString()} nursing charge</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {w.facilities.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/80 font-medium">{f}</span>
                ))}
              </div>
              {w.notes && <p className="text-[11px] text-muted-foreground italic mt-4 pt-3 border-t border-border">{w.notes}</p>}
            </button>
          ))}
          {!wardConfigs.items.length && <p className="text-sm text-muted-foreground py-6 col-span-full text-center">No ward pricing configured yet.</p>}
        </div>
      </Card>

      {/* ===== Private Cabin KPI Strip ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-5 bg-primary text-primary-foreground border-primary">
          <p className="text-[10px] tracking-widest font-bold opacity-80">TOTAL CABINS</p>
          <p className="font-display text-4xl mt-2">{cabins.items.length}</p>
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
          <Chips value={cabFilter} onChange={(v) => setCabFilter(v)} options={[
            { value: "all", label: "All" },
            { value: "Available", label: "Available" },
            { value: "Occupied", label: "Occupied" },
            { value: "Reserved", label: "Reserved" },
            { value: "Cleaning", label: "Cleaning" },
            { value: "Maintenance", label: "Maintenance" },
          ]} />
          <Btn onClick={openAddCab}>+ Add Cabin</Btn>
        </div>} />

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
                    const borderColor = c.status === "Occupied" ? "border-l-destructive" :
                      c.status === "Available" ? "border-l-primary-glow" :
                      c.status === "Reserved" ? "border-l-blue-500" :
                      c.status === "Cleaning" ? "border-l-yellow-400" :
                      "border-l-orange-500";
                    const statusBg = c.status === "Occupied" ? "bg-destructive/10 text-destructive" :
                      c.status === "Available" ? "bg-accent/40 text-accent-foreground" :
                      c.status === "Reserved" ? "bg-blue-50 text-blue-700" :
                      c.status === "Cleaning" ? "bg-yellow-50 text-yellow-800" :
                      "bg-orange-50 text-orange-700";
                    return (
                      <button key={c.id} onClick={() => openEditCab(c)}
                        className={`text-left rounded-2xl bg-card border border-border border-l-[6px] ${borderColor} p-5 hover:shadow-card hover:-translate-y-0.5 transition group`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-primary" />
                              <h5 className="font-display text-lg text-primary">{c.number}</h5>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border font-bold uppercase tracking-tight text-muted-foreground">{c.category}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5">
                              <Users className="h-3 w-3" /> Cap: {c.capacity}
                              <span>•</span>
                              <span className="font-bold text-foreground">₹{c.rate.toLocaleString()}/day</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusBg}`}>{c.status}</span>
                        </div>
                        {c.patient ? (
                          <div className="mt-3 p-2.5 rounded-lg bg-muted/60">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Patient</p>
                            <p className="text-sm font-bold text-foreground">{c.patient}</p>
                            {c.attendant && <p className="text-[11px] text-muted-foreground mt-0.5">Attendant: {c.attendant}</p>}
                          </div>
                        ) : (
                          <div className="mt-3 p-2.5 rounded-lg bg-muted/40">
                            <p className="text-[11px] text-muted-foreground italic">
                              {c.status === "Available" ? "Ready for check-in" : c.status === "Reserved" ? `Reserved for ${c.admittedOn || "upcoming"}` : c.status === "Cleaning" ? "Sanitization in progress" : "Out of service"}
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
      </Card>


      {/* Bed modal */}
      <Modal open={!!edit || add} onClose={() => { setEdit(null); setAdd(false); }}
        title={edit ? `Bed ${edit.number}` : "Add bed"}
        footer={<>
          {edit && <button onClick={() => { setDel(edit.id); }} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>}
          <Btn variant="outline" onClick={() => { setEdit(null); setAdd(false); }}>Cancel</Btn>
          <Btn onClick={() => {}} className="hidden">.</Btn>
          <button form="bed-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="bed-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data = { ward: String(fd.get("ward")), number: String(fd.get("number")), type: String(fd.get("type")), patient: String(fd.get("patient")), status: String(fd.get("status")) };
          if (edit) {
            crud.update(edit.id, data);
            if (data.status === "Occupied" && edit.status !== "Occupied") push({ title: `Patient admitted to ${data.ward} bed ${data.number}`, tone: "info" });
            if (data.status === "Available" && edit.status === "Occupied") push({ title: `Discharge from ${data.ward} bed ${data.number}`, tone: "ok" });
          } else crud.create(data);
          setEdit(null); setAdd(false);
        }}>
          <Field label="Ward"><Select name="ward" defaultValue={edit?.ward}>{wards.concat(["ICU", "Ward 3B", "Maternity"]).filter((v, i, a) => a.indexOf(v) === i).map(w => <option key={w}>{w}</option>)}</Select></Field>
          <Field label="Bed Number" required><Input name="number" defaultValue={edit?.number} required /></Field>
          <Field label="Type"><Select name="type" defaultValue={edit?.type}><option>General</option><option>ICU</option><option>Cabin</option></Select></Field>
          <Field label="Patient (if occupied)"><Input name="patient" defaultValue={edit?.patient} /></Field>
          <Field label="Status"><Select name="status" defaultValue={edit?.status}><option>Available</option><option>Occupied</option><option>Cleaning</option></Select></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) crud.remove(del); setEdit(null); }} />

      {/* Cabin modal */}
      <Modal open={!!editCab || addCab} onClose={() => { setEditCab(null); setAddCab(false); }}
        title={editCab ? `Cabin ${editCab.number}` : "Add cabin"}
        footer={<>
          {editCab && <button onClick={() => setDelCab(editCab.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>}
          <Btn variant="outline" onClick={() => { setEditCab(null); setAddCab(false); }}>Cancel</Btn>
          <button form="cabin-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="cabin-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data: Omit<CabinRow, "id"> = {
            number: String(fd.get("number")),
            category: fd.get("category") as CabinRow["category"],
            floor: String(fd.get("floor")),
            capacity: Number(fd.get("capacity")) || 1,
            rate: Number(fd.get("rate")) || 0,
            amenities: amenityDraft,
            patient: String(fd.get("patient") || ""),
            attendant: String(fd.get("attendant") || ""),
            admittedOn: String(fd.get("admittedOn") || ""),
            status: fd.get("status") as CabinRow["status"],
          };
          if (editCab) {
            cabins.update(editCab.id, data);
            if (data.status === "Occupied" && editCab.status !== "Occupied") push({ title: `Patient admitted to cabin ${data.number}`, tone: "info" });
            if (data.status === "Available" && editCab.status === "Occupied") push({ title: `Discharge from cabin ${data.number}`, tone: "ok" });
            if (data.status === "Reserved" && editCab.status !== "Reserved") push({ title: `Cabin ${data.number} reserved`, tone: "info" });
          } else {
            cabins.create(data);
            push({ title: `Cabin ${data.number} added`, tone: "ok" });
          }
          setEditCab(null); setAddCab(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cabin Number" required><Input name="number" defaultValue={editCab?.number} required /></Field>
            <Field label="Floor" required><Input name="floor" defaultValue={editCab?.floor || "1st Floor"} required /></Field>
            <Field label="Category"><Select name="category" defaultValue={editCab?.category || "Standard"}><option>Standard</option><option>Deluxe</option><option>Premium</option><option>Suite</option></Select></Field>
            <Field label="Status"><Select name="status" defaultValue={editCab?.status || "Available"}><option>Available</option><option>Occupied</option><option>Reserved</option><option>Cleaning</option><option>Maintenance</option></Select></Field>
            <Field label="Capacity"><Input name="capacity" type="number" min="1" defaultValue={editCab?.capacity || 1} /></Field>
            <Field label="Daily Rate (₹)"><Input name="rate" type="number" min="0" defaultValue={editCab?.rate || 0} /></Field>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient"><Input name="patient" defaultValue={editCab?.patient} /></Field>
            <Field label="Attendant"><Input name="attendant" defaultValue={editCab?.attendant} /></Field>
          </div>
          <Field label="Admitted / Reserved On"><Input name="admittedOn" type="date" defaultValue={editCab?.admittedOn} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!delCab} onClose={() => setDelCab(null)} onConfirm={() => { if (delCab) cabins.remove(delCab); setEditCab(null); setDelCab(null); }} />

      {/* Ward Config modal */}
      <Modal open={!!editWc || addWc} onClose={() => { setEditWc(null); setAddWc(false); }}
        title={editWc ? `${editWc.ward} — Pricing & Facilities` : "Add ward pricing"}
        footer={<>
          {editWc && <button onClick={() => setDelWc(editWc.id)} className="mr-auto px-4 py-2 rounded-full text-sm font-semibold text-destructive">Delete</button>}
          <Btn variant="outline" onClick={() => { setEditWc(null); setAddWc(false); }}>Cancel</Btn>
          <button form="wc-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="wc-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data: Omit<WardConfigRow, "id"> = {
            ward: String(fd.get("ward")),
            category: fd.get("category") as WardConfigRow["category"],
            rate: Number(fd.get("rate")) || 0,
            nursingCharge: Number(fd.get("nursingCharge")) || 0,
            facilities: facDraft,
            notes: String(fd.get("notes") || ""),
          };
          if (editWc) {
            wardConfigs.update(editWc.id, data);
            push({ title: `Updated pricing for ${data.ward}`, tone: "ok" });
          } else {
            wardConfigs.create(data);
            push({ title: `Added pricing for ${data.ward}`, tone: "ok" });
          }
          setEditWc(null); setAddWc(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ward Name" required><Input name="ward" defaultValue={editWc?.ward} required placeholder="e.g. Ward 3B / ICU / Maternity" /></Field>
            <Field label="Category"><Select name="category" defaultValue={editWc?.category || "General"}><option>General</option><option>Semi-Private</option><option>ICU</option><option>Maternity</option><option>Pediatric</option></Select></Field>
            <Field label="Daily Rate (₹)" required><Input name="rate" type="number" min="0" defaultValue={editWc?.rate || 0} required /></Field>
            <Field label="Nursing Charge (₹/day)"><Input name="nursingCharge" type="number" min="0" defaultValue={editWc?.nursingCharge || 0} /></Field>
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
          <Field label="Notes"><Input name="notes" defaultValue={editWc?.notes} placeholder="Optional notes" /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!delWc} onClose={() => setDelWc(null)} onConfirm={() => { if (delWc) wardConfigs.remove(delWc); setEditWc(null); setDelWc(null); }} />
    </AdminLayout>

  );
};
export default Wards;

