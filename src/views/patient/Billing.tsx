"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, ShieldCheck, Eye, Receipt, CreditCard, Smartphone, CheckCircle2,
  Printer, Sparkles, ReceiptText, Check, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { useFormatters } from "@/lib/appSettings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { QrCodeSvg } from "@/components/common/QrCodeSvg";

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

type PaymentReceiptData = {
  invoice: Invoice;
  receiptNo: string;
  trxId: string;
  paidAt: string;
  method: string;
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

const PAYMENT_METHODS = [
  { id: "bkash", name: "bKash", color: "bg-pink-600 text-white", icon: Smartphone },
  { id: "nagad", name: "Nagad", color: "bg-orange-600 text-white", icon: Smartphone },
  { id: "rocket", name: "Rocket", color: "bg-purple-700 text-white", icon: Smartphone },
  { id: "card", name: "Visa / Mastercard", color: "bg-slate-800 text-white", icon: CreditCard },
] as const;

const Billing = () => {
  const t = useTranslations("patient.billing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { formatCurrency: fmt } = useFormatters();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ outstanding: 0, last_payment: null, upcoming_due: null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // Payment states
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"bkash" | "nagad" | "rocket" | "card">("bkash");
  const [mobileAccount, setMobileAccount] = useState("017");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);

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

  const handlePayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/v1/patient/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: payingInvoice.id,
          payment_method: selectedMethod,
          mobile_account: mobileAccount,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Payment could not be processed");
        return;
      }

      toast.success(t("paySuccess"));

      const updatedPaidAt = body.data.paid_at;
      const updatedInv = { ...payingInvoice, paid_at: updatedPaidAt, overdue: false };

      // Update state
      setInvoices(prev => prev.map(inv => (inv.id === payingInvoice.id ? updatedInv : inv)));
      setSummary(prev => ({
        ...prev,
        outstanding: Math.max(0, prev.outstanding - payingInvoice.amount),
        last_payment: { amount: payingInvoice.amount, paid_at: updatedPaidAt },
      }));

      // Set and open receipt
      setActiveReceipt({
        invoice: updatedInv,
        receiptNo: body.data.receipt_no,
        trxId: body.data.trx_id,
        paidAt: updatedPaidAt,
        method: selectedMethod.toUpperCase(),
      });

      setPayingInvoice(null);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openExistingReceipt = (inv: Invoice) => {
    setActiveReceipt({
      invoice: inv,
      receiptNo: `RCP-${new Date().getFullYear()}-${inv.reference || inv.id.slice(0, 8).toUpperCase()}`,
      trxId: `TXN${inv.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`,
      paidAt: inv.paid_at || new Date().toISOString(),
      method: "ONLINE / CASHIER",
    });
  };

  return (
    <PatientPortalLayout>
      <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 shadow-glow relative overflow-hidden">
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between relative">
            <div>
              <p className="text-[10px] tracking-widest font-bold opacity-80">{t("outstanding")}</p>
              <p className="font-display text-5xl sm:text-6xl mt-3">{loading ? "—" : fmt(summary.outstanding)}</p>
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

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-chip/60 p-6 border border-border/40 flex flex-col justify-between">
          <div>
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
          </div>

          <div className="pt-4 border-t border-border/40">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>SSL / PCI-DSS Encrypted Payments</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Invoices List */}
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
            <div className="mt-6 grid grid-cols-[1.2fr_1fr_1fr_1fr_160px] gap-4 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50 px-3">
              <div>{t("cols.invoice")}</div>
              <div>{t("cols.due")}</div>
              <div>{t("cols.amount")}</div>
              <div>{t("cols.status")}</div>
              <div className="text-right">ACTION</div>
            </div>
            <div className="mt-2 space-y-2">
              {invoices.map((inv, i) => {
                const status = statusOf(inv);
                const open = openId === inv.id;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`rounded-xl ${status === "paid" ? "hover:bg-muted/30" : "bg-chip/40"}`}>
                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_160px] gap-4 items-center px-3 py-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary text-sm">{inv.reference}</p>
                        {inv.description && <p className="text-xs text-muted-foreground truncate">{inv.description}</p>}
                      </div>
                      <p className="text-sm text-foreground/70">{dateLabel(inv.due_date, locale)}</p>
                      <p className="font-semibold text-primary text-sm">{fmt(inv.amount)}</p>
                      <span className={`justify-self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${STATUS_CLASS[status]}`}>
                        {t(`status.${status}`)}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        {status !== "paid" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPayingInvoice(inv);
                              setMobileAccount("017");
                            }}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 shadow-sm"
                          >
                            {t("payNow")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openExistingReceipt(inv)}
                            className="rounded-full border-border text-xs px-3 hover:bg-chip"
                          >
                            <ReceiptText className="h-3 w-3 mr-1 text-primary" />
                            {t("viewReceipt")}
                          </Button>
                        )}
                        <button
                          onClick={() => inv.lines?.length
                            ? setOpenId(open ? null : inv.id)
                            : toast.info(t("summaryToast", { what: inv.description ?? inv.reference, amount: fmt(inv.amount), date: dateLabel(inv.due_date, locale) }))}
                          className={`p-1.5 rounded-lg hover:bg-chip ${open ? "text-primary" : "text-foreground/60 hover:text-primary"}`}
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

      {/* Bill Payment Helper Banner */}
      <div className="mt-8 rounded-3xl bg-chip/40 p-6 border border-border/40">
        <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow">
          <ShieldCheck className="h-3.5 w-3.5" /> {t("payingTitle")}
        </p>
        <p className="text-sm text-foreground/80 mt-3">{t("payingBody")}</p>
      </div>

      {/* Online Payment Checkout Modal */}
      <Dialog open={!!payingInvoice} onOpenChange={(o) => !o && !submittingPayment && setPayingInvoice(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">{t("paymentModalTitle")}</DialogTitle>
            <DialogDescription>{t("paymentModalSubtitle")}</DialogDescription>
          </DialogHeader>

          {payingInvoice && (
            <form onSubmit={handlePayConfirm} className="space-y-4 mt-2">
              <div className="rounded-2xl bg-chip/50 border border-border/60 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{payingInvoice.reference}</p>
                  <p className="text-sm font-semibold text-primary mt-0.5 truncate max-w-[200px]">
                    {payingInvoice.description ?? "Medical Consultation & Care"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Amount Due</p>
                  <p className="text-2xl font-display font-bold text-primary mt-0.5">{fmt(payingInvoice.amount)}</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">{t("selectMethod")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(method => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        type="button"
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id as "bkash" | "nagad" | "rocket" | "card")}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border bg-card text-foreground/80 hover:bg-chip"
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-lg ${method.color} grid place-items-center shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span>{method.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("mobileNumber")}</Label>
                <input
                  type="text"
                  required
                  value={mobileAccount}
                  onChange={(e) => setMobileAccount(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Simulated secure gateway: invoice will immediately settle upon confirmation.</span>
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setPayingInvoice(null)} disabled={submittingPayment}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={submittingPayment} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submittingPayment ? t("processing") : t("confirmAndPay", { amount: fmt(payingInvoice.amount) })}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Official Payment Receipt Dialog */}
      <Dialog open={!!activeReceipt} onOpenChange={(o) => !o && setActiveReceipt(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border-2 border-primary/20">
          {activeReceipt && (
            <div>
              <div id="payment-receipt-print" className="p-6 space-y-5">
                <div className="flex items-start justify-between border-b border-dashed border-border/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-lg">
                      <Sparkles className="h-5 w-5 text-accent" />
                      <span>HealthFlow Billing Services</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("receiptSubtitle")}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-primary">{activeReceipt.receiptNo}</span>
                  </div>
                </div>

                {/* Paid Seal Box */}
                <div className="rounded-2xl bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 p-5 text-center relative overflow-hidden">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm tracking-widest uppercase">
                    <CheckCircle2 className="h-4 w-4" /> {t("paidSeal")}
                  </div>
                  <p className="font-display text-4xl font-bold text-primary mt-2">
                    {fmt(activeReceipt.invoice.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeReceipt.invoice.description ?? activeReceipt.invoice.reference}
                  </p>
                </div>

                {/* Details breakdown */}
                <div className="space-y-2 text-xs bg-chip/30 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">{t("transactionId")}</span>
                    <span className="font-mono font-semibold text-primary">{activeReceipt.trxId}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">{t("paymentMethod")}</span>
                    <span className="font-semibold text-primary">{activeReceipt.method}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Invoice Reference</span>
                    <span className="font-semibold text-primary">{activeReceipt.invoice.reference}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Paid Date & Time</span>
                    <span className="font-medium text-foreground">{dateLabel(activeReceipt.paidAt, locale)}</span>
                  </div>
                </div>

                {/* Verification QR */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">{t("receiptTitle")}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Scan to verify digital signature and authenticity with hospital accounts registry.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white shadow-sm border border-border/60 shrink-0">
                    <QrCodeSvg value={`https://healthflowbd.com/receipt/${activeReceipt.receiptNo}`} size={72} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="bg-chip/50 px-6 py-4 flex items-center justify-between border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setActiveReceipt(null)}>{tc("cancel")}</Button>
                <Button size="sm" onClick={() => window.print()} className="rounded-full bg-gradient-dark text-surface-dark-foreground shadow-glow">
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> {t("printReceipt")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};

export default Billing;
