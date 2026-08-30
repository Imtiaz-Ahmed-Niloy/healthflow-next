"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, ShieldCheck, Eye, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

type Invoice = {
  id: string;
  reference: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  overdue: boolean;
};

type Summary = {
  outstanding: number;
  last_payment: { amount: number; paid_at: string } | null;
  upcoming_due: { amount: number; due_date: string } | null;
};

/** Taka, like every other money figure in the app. This page used dollars. */
const fmt = (n: number) => `৳${n.toLocaleString()}`;

const dateLabel = (iso: string) => {
  const date = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusOf = (invoice: Invoice) =>
  invoice.paid_at ? "PAID" : invoice.overdue ? "OVERDUE" : "UNPAID";

const STATUS_CLASS: Record<string, string> = {
  PAID: "bg-chip text-primary",
  UNPAID: "bg-primary/10 text-primary",
  OVERDUE: "bg-destructive/15 text-destructive",
};

const Billing = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ outstanding: 0, last_payment: null, upcoming_due: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/patient/billing");
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setFailed(true);
          toast.error(body?.error?.message || "Couldn't load your bills.");
          return;
        }
        setInvoices(body.data.invoices ?? []);
        setSummary(body.data.summary ?? { outstanding: 0, last_payment: null, upcoming_due: null });
      } catch {
        setFailed(true);
        toast.error("Couldn't reach the server.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <PatientPortalLayout>
      <h1 className="font-display text-5xl text-primary">Billing</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Invoices your hospitals have raised for your care.
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 shadow-glow relative overflow-hidden">
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-[10px] tracking-widest font-bold opacity-80">TOTAL OUTSTANDING BALANCE</p>
              <p className="font-display text-6xl mt-3">{loading ? "—" : fmt(summary.outstanding)}</p>
            </div>
            <Building2 className="h-7 w-7" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-10 relative">
            <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
              <p className="text-xs opacity-80">Last Payment</p>
              <p className="font-display text-2xl mt-1">
                {summary.last_payment ? fmt(summary.last_payment.amount) : "—"}
                {summary.last_payment && (
                  <span className="text-xs opacity-70 font-sans"> on {dateLabel(summary.last_payment.paid_at)}</span>
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
              <p className="text-xs opacity-80">Upcoming Due</p>
              <p className="font-display text-2xl mt-1">
                {summary.upcoming_due ? fmt(summary.upcoming_due.amount) : "—"}
                {summary.upcoming_due && (
                  <span className="text-xs opacity-70 font-sans"> {dateLabel(summary.upcoming_due.due_date)}</span>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/*
          This slot held a "GREEN BILLING IMPACT" card claiming the patient had
          saved 12.4kg of paper, over a bar chart of six invented numbers.
          Nothing counts paper. It is replaced by something the page can
          actually answer.
        */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-chip/60 p-6 border border-border/40">
          <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow">
            <Receipt className="h-3.5 w-3.5" /> YOUR INVOICES
          </p>
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">Unpaid</span>
              <span className="font-display text-2xl text-primary">
                {invoices.filter(i => !i.paid_at).length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">Overdue</span>
              <span className="font-display text-2xl text-destructive">
                {invoices.filter(i => i.overdue).length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">Settled</span>
              <span className="font-display text-2xl text-primary/70">
                {invoices.filter(i => i.paid_at).length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
        <h2 className="font-display text-2xl text-primary">Invoice History</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Loading your invoices…</p>
        ) : failed ? (
          <p className="text-sm text-destructive py-10 text-center">
            Your invoices couldn&apos;t be loaded. Reload the page to try again.
          </p>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-primary">No invoices yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bills raised by your hospital will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50 px-3">
              <div>INVOICE</div><div>DUE</div><div>AMOUNT</div><div>STATUS</div><div>VIEW</div>
            </div>
            <div className="mt-2 space-y-2">
              {invoices.map((inv, i) => {
                const status = statusOf(inv);
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 items-center px-3 py-3 rounded-xl ${status === "PAID" ? "hover:bg-muted/30" : "bg-chip/40"}`}>
                    <p className="font-semibold text-primary text-sm">{inv.reference}</p>
                    <p className="text-sm text-foreground/70">{dateLabel(inv.due_date)}</p>
                    <p className="font-semibold text-primary text-sm">{fmt(inv.amount)}</p>
                    <span className={`justify-self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${STATUS_CLASS[status]}`}>
                      {status}
                    </span>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => toast.info(`${inv.reference} · ${fmt(inv.amount)} · due ${dateLabel(inv.due_date)}`)}
                        className="text-foreground/60 hover:text-primary"
                        aria-label={`View ${inv.reference}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/*
        Two panels stood here: a saved VISA card ending 4242, and an "Emerald
        Health Shield" plan covering 85% of lab work. Neither existed. A stored
        card is the worst kind of prop — a patient could reasonably believe the
        hospital holds their card details. Both are gone until the features
        behind them are real; the note below says so rather than pretending.
      */}
      <div className="mt-8 rounded-3xl bg-chip/40 p-6 border border-border/40">
        <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow">
          <ShieldCheck className="h-3.5 w-3.5" /> PAYING A BILL
        </p>
        <p className="text-sm text-foreground/80 mt-3">
          Online payment and insurance claims aren&apos;t available yet. To settle an invoice,
          contact your hospital&apos;s billing desk — they can mark it paid, and it will show as
          settled here.
        </p>
      </div>
    </PatientPortalLayout>
  );
};
export default Billing;
