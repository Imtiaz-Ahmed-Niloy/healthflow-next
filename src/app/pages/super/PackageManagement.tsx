'use client';
import { useEffect, useMemo, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { hospitals } from "@/data/hospitals";
import { loadPricing } from "@/data/pricing";
import { load, save } from "@/lib/storage";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Gift, Search, X } from "lucide-react";

type HospitalPackage = {
  hospitalSlug: string;
  hospitalName: string;
  plan: string;
  basePrice: number;
  discountPct: number;
  offer: string;
  status: "active" | "trial" | "suspended" | "expired";
  billingCycle: "monthly" | "yearly";
  startDate: string;
  renewDate: string;
  notes: string;
};

type Offer = {
  id: string;
  code: string;
  label: string;
  discountPct: number;
  appliesTo: string; // plan name or "all"
  validUntil: string;
  active: boolean;
};

const PKG_KEY = "super-hospital-packages";
const OFFER_KEY = "super-package-offers";

const seedPackages = (): HospitalPackage[] => {
  const plans = loadPricing().plans;
  return hospitals.slice(0, 20).map((h, i) => {
    const plan = plans[i % plans.length];
    return {
      hospitalSlug: h.slug,
      hospitalName: h.name,
      plan: plan.name,
      basePrice: Number(plan.price) || 0,
      discountPct: i % 4 === 0 ? 10 : 0,
      offer: "",
      status: (["active", "active", "trial", "active", "suspended"] as const)[i % 5],
      billingCycle: i % 3 === 0 ? "yearly" : "monthly",
      startDate: new Date(Date.now() - i * 30 * 86400000).toISOString().slice(0, 10),
      renewDate: new Date(Date.now() + (30 - i) * 86400000).toISOString().slice(0, 10),
      notes: "",
    };
  });
};

const seedOffers = (): Offer[] => [
  { id: "of1", code: "WELCOME20", label: "Welcome 20% off first year", discountPct: 20, appliesTo: "all", validUntil: "2026-12-31", active: true },
  { id: "of2", code: "PRO15", label: "Pro plan loyalty 15%", discountPct: 15, appliesTo: "Pro", validUntil: "2026-09-30", active: true },
  { id: "of3", code: "ENT10", label: "Enterprise renewal 10%", discountPct: 10, appliesTo: "Enterprise", validUntil: "2026-06-30", active: false },
];

const Stat = ({ label, value, tone = "primary" }: { label: string; value: string; tone?: string }) => (
  <div className="bg-card rounded-2xl border border-border/60 p-5">
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label}</p>
    <p className={`mt-1 font-display text-2xl text-${tone}`}>{value}</p>
  </div>
);

const statusTone: Record<HospitalPackage["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  trial: "bg-amber-500/15 text-amber-700",
  suspended: "bg-rose-500/15 text-rose-700",
  expired: "bg-muted text-muted-foreground",
};

export default function PackageManagement() {
  const plans = useMemo(() => loadPricing().plans, []);
  const [pkgs, setPkgs] = useState<HospitalPackage[]>(() => load(PKG_KEY, seedPackages()));
  const [offers, setOffers] = useState<Offer[]>(() => load(OFFER_KEY, seedOffers()));
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<HospitalPackage | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  useEffect(() => save(PKG_KEY, pkgs), [pkgs]);
  useEffect(() => save(OFFER_KEY, offers), [offers]);

  const filtered = pkgs.filter(p =>
    (planFilter === "all" || p.plan === planFilter) &&
    (statusFilter === "all" || p.status === statusFilter) &&
    (q === "" || p.hospitalName.toLowerCase().includes(q.toLowerCase()))
  );

  const totalMRR = pkgs
    .filter(p => p.status === "active")
    .reduce((s, p) => s + p.basePrice * (1 - p.discountPct / 100) * (p.billingCycle === "yearly" ? 1 / 12 : 1), 0);

  const savePkg = (p: HospitalPackage) => {
    setPkgs(prev => {
      const i = prev.findIndex(x => x.hospitalSlug === p.hospitalSlug);
      if (i === -1) return [...prev, p];
      const next = [...prev]; next[i] = p; return next;
    });
    setEditing(null);
    toast.success("Package updated");
  };

  const removePkg = (slug: string) => {
    setPkgs(p => p.filter(x => x.hospitalSlug !== slug));
    toast.success("Package removed");
  };

  const saveOffer = (o: Offer) => {
    setOffers(prev => {
      const i = prev.findIndex(x => x.id === o.id);
      if (i === -1) return [...prev, o];
      const next = [...prev]; next[i] = o; return next;
    });
    setEditingOffer(null);
    toast.success("Offer saved");
  };

  return (
    <SuperLayout title="Package Management" subtitle="Assign plans, apply discounts and offers per hospital">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="ACTIVE PACKAGES" value={String(pkgs.filter(p => p.status === "active").length)} />
        <Stat label="TRIAL" value={String(pkgs.filter(p => p.status === "trial").length)} tone="amber-600" />
        <Stat label="MONTHLY REVENUE" value={`$${totalMRR.toFixed(0)}`} tone="emerald-600" />
        <Stat label="ACTIVE OFFERS" value={String(offers.filter(o => o.active).length)} tone="primary-glow" />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/60 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search hospitals…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm" />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
          <option value="all">All plans</option>
          {plans.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-background border border-border text-sm">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
        <button
          onClick={() => setEditing({
            hospitalSlug: "", hospitalName: "", plan: plans[0]?.name || "Basic",
            basePrice: Number(plans[0]?.price) || 0, discountPct: 0, offer: "",
            status: "active", billingCycle: "monthly",
            startDate: new Date().toISOString().slice(0, 10),
            renewDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            notes: "",
          })}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
          <Plus className="h-4 w-4" /> Assign Package
        </button>
      </div>

      {/* Packages table */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-chip/40 text-[11px] tracking-widest font-bold text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Hospital</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Cycle</th>
                <th className="text-right px-4 py-3">Base</th>
                <th className="text-right px-4 py-3">Discount</th>
                <th className="text-right px-4 py-3">Net</th>
                <th className="text-left px-4 py-3">Offer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Renews</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const net = p.basePrice * (1 - p.discountPct / 100);
                return (
                  <tr key={p.hospitalSlug} className="border-t border-border/40 hover:bg-chip/20">
                    <td className="px-4 py-3 font-semibold text-primary">{p.hospitalName}</td>
                    <td className="px-4 py-3">{p.plan}</td>
                    <td className="px-4 py-3 capitalize">{p.billingCycle}</td>
                    <td className="px-4 py-3 text-right">${p.basePrice}</td>
                    <td className="px-4 py-3 text-right">
                      {p.discountPct > 0
                        ? <span className="text-emerald-600 font-semibold">-{p.discountPct}%</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">${net.toFixed(0)}</td>
                    <td className="px-4 py-3">{p.offer || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${statusTone[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.renewDate}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removePkg(p.hospitalSlug)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No packages match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offers */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-primary">Discounts & Offers</h2>
          </div>
          <button
            onClick={() => setEditingOffer({ id: `of${Date.now()}`, code: "", label: "", discountPct: 10, appliesTo: "all", validUntil: "", active: true })}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Plus className="h-4 w-4" /> New Offer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-chip/40 text-[11px] tracking-widest font-bold text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Label</th>
                <th className="text-left px-4 py-3">Applies To</th>
                <th className="text-right px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Valid Until</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} className="border-t border-border/40 hover:bg-chip/20">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{o.code}</td>
                  <td className="px-4 py-3">{o.label}</td>
                  <td className="px-4 py-3">{o.appliesTo}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-semibold">-{o.discountPct}%</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.validUntil || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${o.active ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {o.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingOffer(o)} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => { setOffers(prev => prev.filter(x => x.id !== o.id)); toast.success("Offer deleted"); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit package modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.hospitalSlug ? "Edit Package" : "Assign Package"}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hospital">
              <select
                value={editing.hospitalSlug}
                onChange={e => {
                  const h = hospitals.find(x => x.slug === e.target.value);
                  setEditing({ ...editing, hospitalSlug: e.target.value, hospitalName: h?.name || "" });
                }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                <option value="">Select hospital…</option>
                {hospitals.map(h => <option key={h.slug} value={h.slug}>{h.name}</option>)}
              </select>
            </Field>
            <Field label="Plan">
              <select value={editing.plan}
                onChange={e => {
                  const pl = plans.find(p => p.name === e.target.value);
                  setEditing({ ...editing, plan: e.target.value, basePrice: Number(pl?.price) || editing.basePrice });
                }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                {plans.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Base Price (USD)">
              <input type="number" value={editing.basePrice}
                onChange={e => setEditing({ ...editing, basePrice: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Discount (%)">
              <input type="number" min={0} max={100} value={editing.discountPct}
                onChange={e => setEditing({ ...editing, discountPct: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Billing Cycle">
              <select value={editing.billingCycle}
                onChange={e => setEditing({ ...editing, billingCycle: e.target.value as never })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value as never })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
            <Field label="Start Date">
              <input type="date" value={editing.startDate}
                onChange={e => setEditing({ ...editing, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Renews On">
              <input type="date" value={editing.renewDate}
                onChange={e => setEditing({ ...editing, renewDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Applied Offer Code" full>
              <select value={editing.offer}
                onChange={e => {
                  const code = e.target.value;
                  const o = offers.find(x => x.code === code);
                  setEditing({ ...editing, offer: code, discountPct: o ? o.discountPct : editing.discountPct });
                }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                <option value="">— None —</option>
                {offers.filter(o => o.active).map(o => (
                  <option key={o.id} value={o.code}>{o.code} — {o.label} ({o.discountPct}%)</option>
                ))}
              </select>
            </Field>
            <Field label="Notes" full>
              <textarea value={editing.notes} rows={3}
                onChange={e => setEditing({ ...editing, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
          </div>
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-border/50">
            <p className="text-sm">
              <span className="text-muted-foreground">Net price:</span>{" "}
              <span className="font-bold text-primary">
                ${(editing.basePrice * (1 - editing.discountPct / 100)).toFixed(2)} / {editing.billingCycle === "yearly" ? "year" : "mo"}
              </span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold">Cancel</button>
              <button
                onClick={() => editing.hospitalSlug ? savePkg(editing) : toast.error("Select a hospital")}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit offer modal */}
      {editingOffer && (
        <Modal onClose={() => setEditingOffer(null)} title="Offer / Discount Code">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code">
              <input value={editingOffer.code} onChange={e => setEditingOffer({ ...editingOffer, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono" />
            </Field>
            <Field label="Discount (%)">
              <input type="number" min={0} max={100} value={editingOffer.discountPct}
                onChange={e => setEditingOffer({ ...editingOffer, discountPct: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Label" full>
              <input value={editingOffer.label} onChange={e => setEditingOffer({ ...editingOffer, label: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Applies To">
              <select value={editingOffer.appliesTo} onChange={e => setEditingOffer({ ...editingOffer, appliesTo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm">
                <option value="all">All Plans</option>
                {plans.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Valid Until">
              <input type="date" value={editingOffer.validUntil}
                onChange={e => setEditingOffer({ ...editingOffer, validUntil: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            </Field>
            <Field label="Status" full>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editingOffer.active}
                  onChange={e => setEditingOffer({ ...editingOffer, active: e.target.checked })} />
                Offer is active
              </label>
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border/50">
            <button onClick={() => setEditingOffer(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold">Cancel</button>
            <button onClick={() => editingOffer.code ? saveOffer(editingOffer) : toast.error("Code required")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Save Offer</button>
          </div>
        </Modal>
      )}
    </SuperLayout>
  );
}

const Field = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
  <div className={full ? "col-span-2" : ""}>
    <label className="block text-[11px] tracking-widest font-bold text-muted-foreground mb-1.5">{label}</label>
    {children}
  </div>
);

const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
    <div className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-border/50 sticky top-0 bg-card">
        <h3 className="font-display text-xl text-primary">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
