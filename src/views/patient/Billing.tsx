"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, ShieldCheck, Eye, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { useFormatters } from "@/lib/appSettings";

type Line = { description: string; quantity: number; rate: number; amount: number };

type Invoice = {
  id: string;
  reference: string;
  description: string | null;
  /** A hospital stay's charges, day by day. Null for a single-amount bill. */
  lines: Line[] | null;
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

/** Month names in the page's language; digits stay Western (see appSettings). */
const dateLabel = (iso: string, locale: string) => {
  const date = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { month: "short", day: "numeric", year: "numeric" });
};

type Status = "paid" | "unpaid" | "overdue";

const statusOf = (invoice: Invoice): Status =>
  invoice.paid_at ? "paid" : invoice.overdue ? "overdue" : "unpaid";

const STATUS_CLASS: Record<Status, string> = {
  paid: "bg-chip text-primary",
  unpaid: "bg-primary/10 text-primary",
  overdue: "bg-destructive/15 text-destructive",
};

const Billing = () => {
  const t = useTranslations("patient.billing");
  const tc = useTranslations("common");
  const locale = useLocale();
  // The platform currency from global settings, like every money figure in
  // the app. This page had ৳ typed in, and before that dollars.
  const { formatCurrency: fmt } = useFormatters();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ outstanding: 0, last_payment: null, upcoming_due: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/patient/billing");
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setFailed(true);
          toast.error(body?.error?.message || t("loadFailed"));
          return;
        }
        setInvoices(body.data.invoices ?? []);
        setSummary(body.data.summary ?? { outstanding: 0, last_payment: null, upcoming_due: null });
      } catch {
        setFailed(true);
        toast.error(tc("networkError"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <PatientPortalLayout>
      <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 shadow-glow relative overflow-hidden">
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-[10px] tracking-widest font-bold opacity-80">{t("outstanding")}</p>
              <p className="font-display text-6xl mt-3">{loading ? "—" : fmt(summary.outstanding)}</p>
            </div>
            <Building2 className="h-7 w-7" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-10 relative">
            <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
              <p className="text-xs opacity-80">{t("lastPayment")}</p>
              <p className="font-display text-2xl mt-1">
                {summary.last_payment ? fmt(summary.last_payment.amount) : "—"}
                {summary.last_payment && (
                  <span className="text-xs opacity-70 font-sans"> {t("on", { date: dateLabel(summary.last_payment.paid_at, locale) })}</span>
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
              <p className="text-xs opacity-80">{t("upcomingDue")}</p>
              <p className="font-display text-2xl mt-1">
                {summary.upcoming_due ? fmt(summary.upcoming_due.amount) : "—"}
                {summary.upcoming_due && (
                  <span className="text-xs opacity-70 font-sans"> {dateLabel(summary.upcoming_due.due_date, locale)}</span>
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
            <Receipt className="h-3.5 w-3.5" /> {t("yourInvoices")}
          </p>
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">{t("unpaid")}</span>
              <span className="font-display text-2xl text-primary">
                {invoices.filter(i => !i.paid_at).length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">{t("overdue")}</span>
              <span className="font-display text-2xl text-destructive">
                {invoices.filter(i => i.overdue).length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-foreground/70">{t("settled")}</span>
              <span className="font-display text-2xl text-primary/70">
                {invoices.filter(i => i.paid_at).length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
        <h2 className="font-display text-2xl text-primary">{t("history")}</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">{t("loading")}</p>
        ) : failed ? (
          <p className="text-sm text-destructive py-10 text-center">{t("failed")}</p>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-primary">{t("emptyTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("emptyBody")}</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50 px-3">
              <div>{t("cols.invoice")}</div><div>{t("cols.due")}</div><div>{t("cols.amount")}</div><div>{t("cols.status")}</div><div>{t("cols.view")}</div>
            </div>
            <div className="mt-2 space-y-2">
              {invoices.map((inv, i) => {
                const status = statusOf(inv);
                const open = openId === inv.id;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`rounded-xl ${status === "paid" ? "hover:bg-muted/30" : "bg-chip/40"}`}>
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px] gap-4 items-center px-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary text-sm">{inv.reference}</p>
                      {inv.description && <p className="text-xs text-muted-foreground truncate">{inv.description}</p>}
                    </div>
                    <p className="text-sm text-foreground/70">{dateLabel(inv.due_date, locale)}</p>
                    <p className="font-semibold text-primary text-sm">{fmt(inv.amount)}</p>
                    <span className={`justify-self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${STATUS_CLASS[status]}`}>
                      {t(`status.${status}`)}
                    </span>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => inv.lines?.length
                          ? setOpenId(open ? null : inv.id)
                          : toast.info(t("summaryToast", { what: inv.description ?? inv.reference, amount: fmt(inv.amount), date: dateLabel(inv.due_date, locale) }))}
                        className={open ? "text-primary" : "text-foreground/60 hover:text-primary"}
                        aria-label={t("viewInvoice", { ref: inv.reference })}
                        aria-expanded={inv.lines?.length ? open : undefined}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {open && inv.lines && (
                    <div className="px-3 pb-4">
                      <div className="rounded-xl border border-border/50 bg-card overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-muted-foreground">
                            <tr>
                              <th className="text-left font-semibold px-3 py-2">{t("lines.charge")}</th>
                              <th className="text-right font-semibold px-3 py-2">{t("lines.days")}</th>
                              <th className="text-right font-semibold px-3 py-2">{t("lines.rate")}</th>
                              <th className="text-right font-semibold px-3 py-2">{t("lines.amount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.lines.map((l, n) => (
                              <tr key={n} className="border-t border-border/50">
                                <td className="px-3 py-2">{l.description}</td>
                                <td className="px-3 py-2 text-right">{l.quantity}</td>
                                <td className="px-3 py-2 text-right">{fmt(Number(l.rate))}</td>
                                <td className="px-3 py-2 text-right font-medium">{fmt(Number(l.amount))}</td>
                              </tr>
                            ))}
                            <tr className="border-t border-border/50 font-semibold text-primary">
                              <td className="px-3 py-2" colSpan={3}>{t("lines.total")}</td>
                              <td className="px-3 py-2 text-right">{fmt(inv.amount)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
          <ShieldCheck className="h-3.5 w-3.5" /> {t("payingTitle")}
        </p>
        <p className="text-sm text-foreground/80 mt-3">{t("payingBody")}</p>
      </div>
    </PatientPortalLayout>
  );
};
export default Billing;
