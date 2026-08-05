"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Receipt, Wallet, AlertCircle, TrendingUp, Plus, Trash2, Building2, ArrowUpRight, FileText, Tag, Percent, X } from "lucide-react";
import { toast } from "sonner";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, Kpi, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { Modal } from "@/components/admin/crud";
import { load, save, uid } from "@/lib/storage";

// ---- Types ----
type Hospital = { id: string; name: string; plan?: string; email?: string; status?: string };

type LineItem = { id: string; label: string; amount: number };
type Invoice = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  month: string;            // YYYY-MM
  plan: string;
  subscriptionFee: number;
  prescriptionCount: number;
  perPrescriptionRate: number;
  prescriptionTotal: number;
  extras: LineItem[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  offerLabel: string;
  total: number;
  status: "paid" | "pending" | "overdue";
  createdAt: string;
  dueDate: string;
};

// ---- Constants ----
const HOSPITAL_KEY = "super-hospitals";
const INVOICE_KEY = "super-invoices";
const RX_COUNT_KEY = "super-rx-counts"; // { [hospitalId]: count }

const PLAN_RATES: Record<string, number> = {
  Starter: 99,
  Basic: 99,
  Pro: 499,
  Enterprise: 1999,
  Trial: 0,
};
const DEFAULT_RX_RATE = 0.5; // per prescription

const planFee = (plan?: string) => PLAN_RATES[plan || ""] ?? 99;
const tone = (s: Invoice["status"]) => (s === "paid" ? "ok" : s === "overdue" ? "bad" : "warn");
const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ============================================================

const Billing = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>(() => load<Hospital[]>(HOSPITAL_KEY, []));
  const [invoices, setInvoices] = useState<Invoice[]>(() => load<Invoice[]>(INVOICE_KEY, []));
  const [rxCounts, setRxCounts] = useState<Record<string, number>>(() => load<Record<string, number>>(RX_COUNT_KEY, {}));
  const [activeId, setActiveId] = useState<string>("");
  const [genOpen, setGenOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Sync storage when hospitals change in other tabs (e.g. onboarding)
  useEffect(() => {
    const sync = () => setHospitals(load<Hospital[]>(HOSPITAL_KEY, []));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, []);

  useEffect(() => { save(INVOICE_KEY, invoices); }, [invoices]);
  useEffect(() => { save(RX_COUNT_KEY, rxCounts); }, [rxCounts]);

  useEffect(() => {
    if (!activeId && hospitals.length) setActiveId(hospitals[0].id);
  }, [hospitals, activeId]);

  const filteredHospitals = useMemo(
    () => hospitals.filter(h => h.name?.toLowerCase().includes(search.toLowerCase())),
    [hospitals, search]
  );

  const active = hospitals.find(h => h.id === activeId);
  const activeInvoices = useMemo(
    () => invoices.filter(i => i.hospitalId === activeId).sort((a, b) => b.month.localeCompare(a.month)),
    [invoices, activeId]
  );

  // ---- KPIs ----
  const mtd = currentMonth();
  const kpis = useMemo(() => {
    const paid = invoices.filter(i => i.status === "paid" && i.createdAt.slice(0, 7) === mtd).reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
    const arr = hospitals.reduce((s, h) => s + planFee(h.plan) * 12, 0);
    return { paid, outstanding, overdue, arr };
  }, [invoices, hospitals, mtd]);

  const addInvoice = (inv: Invoice) => setInvoices(p => [inv, ...p]);
  const setStatus = (id: string, status: Invoice["status"]) => {
    setInvoices(p => p.map(i => i.id === id ? { ...i, status } : i));
    toast.success(`Marked ${status}`);
  };
  const removeInvoice = (id: string) => {
    setInvoices(p => p.filter(i => i.id !== id));
    toast.success("Invoice deleted");
  };

  return (
    <SuperLayout title="Billing" subtitle="Per-hospital subscription & usage billing">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Wallet} label="Collected (MTD)" value={money(kpis.paid)} trend={kpis.paid > 0 ? "+live" : undefined} />
        <Kpi icon={Receipt} label="Outstanding" value={money(kpis.outstanding)} tone="chip" />
        <Kpi icon={AlertCircle} label="Overdue" value={money(kpis.overdue)} tone="destructive" />
        <Kpi icon={TrendingUp} label="ARR Forecast" value={money(kpis.arr)} tone="accent" />
      </div>

      {/* Hospital tabs + detail */}
      <Card className="p-5 mt-6">
        <SectionTitle
          title="Hospital Billing"
          action={
            <Link href="/super/hospitals" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Manage hospitals <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {hospitals.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No hospitals onboarded yet. Add hospitals from{" "}
              <Link href="/super/hospitals" className="text-primary font-semibold hover:underline">Hospital Management</Link>{" "}
              and billing tabs will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[260px_1fr] gap-5">
            {/* Sidebar tab list */}
            <div className="space-y-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search hospital…"
                className="w-full h-9 rounded-full bg-muted/40 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="rounded-xl border border-border/60 max-h-[460px] overflow-y-auto divide-y divide-border/40">
                {filteredHospitals.map(h => {
                  const open = invoices.filter(i => i.hospitalId === h.id && i.status !== "paid").length;
                  const isActive = h.id === activeId;
                  return (
                    <button
                      key={h.id}
                      onClick={() => setActiveId(h.id)}
                      className={`w-full text-left p-3 transition-colors ${isActive ? "bg-primary/10" : "hover:bg-muted/60"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{h.name}</p>
                        {open > 0 && <span className="shrink-0 text-[10px] font-bold bg-destructive/15 text-destructive rounded-full px-1.5 py-0.5">{open} due</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Pill tone="info">{h.plan || "Starter"}</Pill>
                        <span className="text-[11px] text-muted-foreground">{money(planFee(h.plan))}/mo</span>
                      </div>
                    </button>
                  );
                })}
                {filteredHospitals.length === 0 && (
                  <p className="p-4 text-xs text-muted-foreground italic">No matches.</p>
                )}
              </div>
            </div>

            {/* Detail */}
            <div>
              {active ? (
                <HospitalBillingPanel
                  hospital={active}
                  invoices={activeInvoices}
                  rxCount={rxCounts[active.id] ?? 0}
                  onRxCount={(n) => setRxCounts(p => ({ ...p, [active.id]: n }))}
                  onGenerate={() => setGenOpen(true)}
                  onStatus={setStatus}
                  onDelete={removeInvoice}
                />
              ) : null}
            </div>
          </div>
        )}
      </Card>

      {/* Generate bill modal */}
      {active && (
        <GenerateBillModal
          open={genOpen}
          onClose={() => setGenOpen(false)}
          hospital={active}
          defaultRx={rxCounts[active.id] ?? 0}
          onSave={(inv) => { addInvoice(inv); setGenOpen(false); toast.success("Invoice generated"); }}
        />
      )}
    </SuperLayout>
  );
};

// ============================================================

const HospitalBillingPanel = ({
  hospital, invoices, rxCount, onRxCount, onGenerate, onStatus, onDelete,
}: {
  hospital: Hospital;
  invoices: Invoice[];
  rxCount: number;
  onRxCount: (n: number) => void;
  onGenerate: () => void;
  onStatus: (id: string, s: Invoice["status"]) => void;
  onDelete: (id: string) => void;
}) => {
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const lastInv = invoices[0];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/30 p-5 border border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl text-primary">{hospital.name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Pill tone="info">{hospital.plan || "Starter"} Plan</Pill>
              <span className="text-xs text-muted-foreground">{money(planFee(hospital.plan))}/month subscription</span>
            </div>
          </div>
          <Btn onClick={onGenerate}><Plus className="h-4 w-4" /> Generate Monthly Bill</Btn>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <Stat label="Invoices" value={String(invoices.length)} />
          <Stat label="Lifetime Billed" value={money(total)} />
          <Stat label="Last Invoice" value={lastInv ? money(lastInv.total) : "—"} />
          <Stat label="Last Status" value={lastInv ? lastInv.status : "—"} />
        </div>
      </div>

      {/* Live prescription counter */}
      <div className="rounded-xl border border-border/60 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PRESCRIPTIONS THIS CYCLE</p>
            <p className="text-sm text-muted-foreground">Synced from the doctor panel. Adjust if needed before billing.</p>
          </div>
        </div>
        <input
          type="number" min={0} value={rxCount}
          onChange={e => onRxCount(Math.max(0, Number(e.target.value) || 0))}
          className="h-10 w-28 rounded-lg border border-border bg-background px-3 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Invoices</p>
          <span className="text-xs text-muted-foreground">{invoices.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-left text-[10px] tracking-widest text-muted-foreground bg-muted/30">
              <tr>
                <th className="px-4 py-2.5">Invoice</th><th>Month</th><th>Rx</th><th>Discount</th><th>Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground italic">No invoices yet. Generate the first monthly bill.</td></tr>
              ) : invoices.map(i => (
                <tr key={i.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{i.id.slice(0, 8).toUpperCase()}</td>
                  <td>{i.month}</td>
                  <td>{i.prescriptionCount}</td>
                  <td>{i.discountPct > 0 ? `${i.discountPct}% ${i.offerLabel ? `(${i.offerLabel})` : ""}` : "—"}</td>
                  <td className="font-semibold text-primary">{money(i.total)}</td>
                  <td><Pill tone={tone(i.status) as never}>{i.status}</Pill></td>
                  <td className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <select
                        value={i.status} onChange={e => onStatus(i.id, e.target.value as Invoice["status"])}
                        className="h-7 rounded-md border border-border bg-background text-xs px-1.5"
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="overdue">overdue</option>
                      </select>
                      <button onClick={() => onDelete(i.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-card/60 backdrop-blur p-3 border border-border/40">
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label.toUpperCase()}</p>
    <p className="font-display text-lg text-primary mt-0.5 capitalize">{value}</p>
  </div>
);

// ============================================================

const GenerateBillModal = ({
  open, onClose, hospital, defaultRx, onSave,
}: {
  open: boolean; onClose: () => void; hospital: Hospital; defaultRx: number;
  onSave: (inv: Invoice) => void;
}) => {
  const [month, setMonth] = useState(currentMonth());
  const [subscriptionFee, setSubscriptionFee] = useState(planFee(hospital.plan));
  const [rx, setRx] = useState(defaultRx);
  const [rxRate, setRxRate] = useState(DEFAULT_RX_RATE);
  const [extras, setExtras] = useState<LineItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [offerLabel, setOfferLabel] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    if (open) {
      setMonth(currentMonth());
      setSubscriptionFee(planFee(hospital.plan));
      setRx(defaultRx);
      setRxRate(DEFAULT_RX_RATE);
      setExtras([]);
      setDiscountPct(0);
      setOfferLabel("");
    }
  }, [open, hospital, defaultRx]);

  const prescriptionTotal = rx * rxRate;
  const extrasTotal = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const subtotal = subscriptionFee + prescriptionTotal + extrasTotal;
  const discountAmt = (subtotal * (Number(discountPct) || 0)) / 100;
  const total = Math.max(0, subtotal - discountAmt);

  const addExtra = () => setExtras(p => [...p, { id: uid(), label: "", amount: 0 }]);
  const updExtra = (id: string, patch: Partial<LineItem>) =>
    setExtras(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
  const rmExtra = (id: string) => setExtras(p => p.filter(e => e.id !== id));

  const handleSave = () => {
    const inv: Invoice = {
      id: uid(),
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      month,
      plan: hospital.plan || "Starter",
      subscriptionFee,
      prescriptionCount: rx,
      perPrescriptionRate: rxRate,
      prescriptionTotal,
      extras,
      subtotal,
      discountPct,
      discountAmt,
      offerLabel,
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
      dueDate,
    };
    onSave(inv);
  };

  const PRESET_OFFERS = [
    { label: "Launch Promo", pct: 10 },
    { label: "Loyalty 6mo", pct: 15 },
    { label: "Annual Prepay", pct: 20 },
    { label: "Strategic Partner", pct: 25 },
  ];

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={`Generate Bill — ${hospital.name}`}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-semibold border border-border hover:bg-muted">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">
            Save Invoice — {money(total)}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Billing Month">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Due Date">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="rounded-xl bg-muted/30 p-4 space-y-3">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CHARGES</p>
          <Row label={`Subscription (${hospital.plan || "Starter"})`}>
            <NumInput value={subscriptionFee} onChange={setSubscriptionFee} />
          </Row>
          <Row label="Prescriptions submitted">
            <div className="flex items-center gap-2">
              <NumInput value={rx} onChange={setRx} width="w-20" />
              <span className="text-xs text-muted-foreground">×</span>
              <NumInput value={rxRate} onChange={setRxRate} step={0.1} width="w-20" />
              <span className="text-xs text-muted-foreground">= {money(prescriptionTotal)}</span>
            </div>
          </Row>

          {/* Extras */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground/80">Other bills</p>
              <button onClick={addExtra} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add line item
              </button>
            </div>
            <div className="space-y-2">
              {extras.length === 0 && <p className="text-xs italic text-muted-foreground">No extra line items.</p>}
              {extras.map(e => (
                <div key={e.id} className="flex items-center gap-2">
                  <input
                    placeholder="Description (e.g. SMS credits, training)"
                    value={e.label} onChange={ev => updExtra(e.id, { label: ev.target.value })}
                    className={`${inputCls} flex-1`}
                  />
                  <NumInput value={e.amount} onChange={(v) => updExtra(e.id, { amount: v })} />
                  <button onClick={() => rmExtra(e.id)} className="p-2 rounded-md text-destructive hover:bg-destructive/10">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Discount & offers */}
        <div className="rounded-xl bg-accent/20 p-4 space-y-3 border border-accent/40">
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground flex items-center gap-1.5"><Tag className="h-3 w-3" /> DISCOUNTS & OFFERS</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_OFFERS.map(o => (
              <button key={o.label} onClick={() => { setDiscountPct(o.pct); setOfferLabel(o.label); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${offerLabel === o.label ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-card"}`}>
                {o.label} · {o.pct}%
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Offer label">
              <input value={offerLabel} onChange={e => setOfferLabel(e.target.value)} placeholder="e.g. Holiday Promo" className={inputCls} />
            </Field>
            <Field label="Discount %">
              <div className="relative">
                <NumInput value={discountPct} onChange={setDiscountPct} width="w-full" />
                <Percent className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </Field>
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-primary/5 p-4 space-y-1.5">
          <Total label="Subtotal" value={money(subtotal)} />
          {discountAmt > 0 && <Total label={`Discount (${discountPct}%${offerLabel ? ` · ${offerLabel}` : ""})`} value={`− ${money(discountAmt)}`} muted />}
          <div className="border-t border-border/60 pt-2 mt-2">
            <Total label="Total Due" value={money(total)} big />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const inputCls = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">{label.toUpperCase()}</p>
    {children}
  </label>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <p className="text-sm text-foreground/80">{label}</p>
    {children}
  </div>
);

const NumInput = ({ value, onChange, step = 1, width = "w-28" }: { value: number; onChange: (v: number) => void; step?: number; width?: string }) => (
  <input
    type="number" min={0} step={step} value={value}
    onChange={e => onChange(Number(e.target.value) || 0)}
    className={`h-9 ${width} rounded-lg border border-border bg-background px-3 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/30`}
  />
);

const Total = ({ label, value, big, muted }: { label: string; value: string; big?: boolean; muted?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={`${big ? "text-sm font-semibold text-primary" : "text-xs"} ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
    <span className={`${big ? "font-display text-2xl text-primary" : "text-sm font-semibold"} ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</span>
  </div>
);

export default Billing;

