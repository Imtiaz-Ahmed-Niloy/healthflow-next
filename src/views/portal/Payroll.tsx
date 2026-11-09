"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Printer, Trash2, Undo2, UsersRound, Wallet, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Btn, Pill } from "@/components/admin/ui";
import { ConfirmDialog, Field, Input, Modal, Select, TextArea } from "@/components/admin/crud";
import { Avatar } from "@/components/common/Avatar";
import { useFormatters } from "@/lib/appSettings";
import { useSession, displayName } from "@/lib/auth/useSession";
import {
  netOf, PAYROLL_METHODS, PAYSLIP_AMOUNTS, shiftMonth, thisMonth,
  type DoctorPayslip, type PayrollMethod, type PayrollTotals, type PayslipAmount, type PayslipAmounts,
} from "@/lib/staffPayroll";

/**
 * /portal/payroll — what the doctor pays their own team each month (0152).
 *
 * A month at a time: "make this month's payslips" starts one for every active
 * member at their monthly salary (set on /portal/team), the doctor adjusts
 * allowance, bonus, deductions and advances, then marks each one paid. The
 * hospitals' assistants are paid by the hospital and aren't here.
 */

type Member = { id: string; name: string; role: string; status: string; monthly_salary: number };

type Draft = PayslipAmounts & { notes: string; member_id: string };

const EMPTY_TOTALS: PayrollTotals = { count: 0, gross: 0, net: 0, paid: 0, unpaid: 0 };

const today = () => new Date().toISOString().slice(0, 10);

const draftOf = (slip: DoctorPayslip): Draft => ({
  member_id: slip.member_id,
  basic: Number(slip.basic),
  allowance: Number(slip.allowance),
  bonus: Number(slip.bonus),
  deduction: Number(slip.deduction),
  advance: Number(slip.advance),
  notes: slip.notes ?? "",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const Payroll = () => {
  const t = useTranslations("portal.payroll");
  const tt = useTranslations("portal.team");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { formatCurrency, formatDate } = useFormatters();
  const { user } = useSession();

  const [month, setMonth] = useState(thisMonth);
  const [slips, setSlips] = useState<DoctorPayslip[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [totals, setTotals] = useState<PayrollTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // The slip being edited, or "new" for one added by hand.
  const [editing, setEditing] = useState<DoctorPayslip | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [paying, setPaying] = useState<DoctorPayslip | null>(null);
  const [payMethod, setPayMethod] = useState<PayrollMethod>("cash");
  const [paidOn, setPaidOn] = useState(today);
  const [removing, setRemoving] = useState<DoctorPayslip | null>(null);

  const monthLabel = useMemo(
    () => new Date(`${month}-01T00:00:00`).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { month: "long", year: "numeric" }),
    [month, locale],
  );

  const load = async (target = month) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/portal/payroll?month=${target}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(t("loadFailed"), { description: body?.error?.message }); return; }
      setSlips(body.data ?? []);
      setMembers(body.members ?? []);
      setTotals(body.totals ?? EMPTY_TOTALS);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(month); }, [month]);

  const call = async (method: "POST" | "PATCH" | "DELETE", body?: unknown, query = "") => {
    const res = await fetch(`/api/v1/portal/payroll${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message ?? res.statusText);
    return json;
  };

  const generate = async () => {
    setBusy("generate");
    try {
      const json = await call("POST", { action: "generate", month });
      toast.success(t("generated", { count: json?.data?.created ?? 0 }));
      void load();
    } catch (error) {
      toast.error(t("generateFailed"), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const open = (slip: DoctorPayslip | "new") => {
    if (slip === "new") {
      const first = members.find(m => m.status === "active" && !slips.some(s => s.member_id === m.id));
      setDraft({ member_id: first?.id ?? "", basic: first?.monthly_salary ?? 0, allowance: 0, bonus: 0, deduction: 0, advance: 0, notes: "" });
    } else {
      setDraft(draftOf(slip));
    }
    setEditing(slip);
  };

  const save = async () => {
    if (!editing || !draft) return;
    if (editing === "new" && !draft.member_id) { toast.error(t("pickMember")); return; }
    setBusy("save");
    try {
      const { member_id, ...amounts } = draft;
      if (editing === "new") await call("POST", { action: "create", month, member_id, ...amounts });
      else await call("PATCH", { id: editing.id, ...amounts });
      toast.success(t("saved"));
      setEditing(null);
      void load();
    } catch (error) {
      toast.error(t("saveFailed"), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const pay = async () => {
    if (!paying) return;
    setBusy(paying.id);
    try {
      await call("PATCH", { id: paying.id, action: "pay", payment_method: payMethod, paid_on: paidOn });
      toast.success(t("paidDone", { name: paying.member_name }));
      setPaying(null);
      void load();
    } catch (error) {
      toast.error(t("saveFailed"), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const unpay = async (slip: DoctorPayslip) => {
    setBusy(slip.id);
    try {
      await call("PATCH", { id: slip.id, action: "unpay" });
      toast.success(t("unpaidDone"));
      void load();
    } catch (error) {
      toast.error(t("saveFailed"), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (slip: DoctorPayslip) => {
    setBusy(slip.id);
    try {
      await call("DELETE", undefined, `?id=${slip.id}`);
      toast.success(t("removed"));
      void load();
    } catch (error) {
      toast.error(t("saveFailed"), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const print = (slip: DoctorPayslip) => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const row = (label: string, value: number) =>
      `<tr><td>${escapeHtml(label)}</td><td class="r">${escapeHtml(formatCurrency(Number(value)))}</td></tr>`;
    const doctor = user ? displayName(user) : "";
    w.document.write(`<!doctype html><html lang="${locale}"><head><title>${escapeHtml(t("slip.heading"))} · ${escapeHtml(slip.member_name)}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{margin:0 0 4px;font-size:22px}p{margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:8px 0;border-bottom:1px solid #eee}.r{text-align:right}
h2{font-size:14px;margin:22px 0 0;text-transform:none}.net td{font-weight:700;font-size:16px;border-top:2px solid #111}
.sign{margin-top:64px;border-top:1px solid #999;width:220px;padding-top:6px;color:#555}</style></head><body>
<h1>${escapeHtml(t("slip.heading"))}</h1>
<p>${escapeHtml(slip.member_name)} · ${escapeHtml(tt(`roles.${slip.member_role as "assistant"}.one`))}</p>
<p>${escapeHtml(t("slip.period", { month: monthLabel }))}</p>
${doctor ? `<p>${escapeHtml(t("slip.from", { doctor }))}</p>` : ""}
<h2>${escapeHtml(t("slip.earnings"))}</h2>
<table>${row(t("fields.basic"), slip.basic)}${row(t("fields.allowance"), slip.allowance)}${row(t("fields.bonus"), slip.bonus)}</table>
<h2>${escapeHtml(t("slip.deductions"))}</h2>
<table>${row(t("fields.deduction"), slip.deduction)}${row(t("fields.advance"), slip.advance)}
<tr class="net"><td>${escapeHtml(t("fields.net"))}</td><td class="r">${escapeHtml(formatCurrency(Number(slip.net)))}</td></tr></table>
${slip.status === "paid" && slip.paid_on ? `<p style="margin-top:14px">${escapeHtml(t("paidOn", { date: formatDate(slip.paid_on), method: t(`methods.${slip.payment_method ?? "cash"}`) }))}</p>` : ""}
${slip.notes ? `<p style="margin-top:8px">${escapeHtml(slip.notes)}</p>` : ""}
<div class="sign">${escapeHtml(t("slip.signature"))}</div>
<script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  const activeMembers = members.filter(m => m.status === "active");
  const withoutSalary = activeMembers.filter(m => !Number(m.monthly_salary)).length;
  const missing = activeMembers.filter(m => !slips.some(s => s.member_id === m.id));
  const editingSlip = editing && editing !== "new" ? editing : null;
  const locked = editingSlip?.status === "paid";

  const setAmount = (key: PayslipAmount, value: string) =>
    setDraft(d => (d ? { ...d, [key]: value === "" ? 0 : Number(value) } : d));

  const card = (label: string, value: number, tone: string) => (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${tone}`}>{formatCurrency(value)}</p>
    </div>
  );

  return (
    <PortalLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-primary">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button type="button" onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label={t("prevMonth")} className="rounded-full p-2 hover:bg-chip">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel}</span>
          <button type="button" onClick={() => setMonth(m => shiftMonth(m, 1))} aria-label={t("nextMonth")} className="rounded-full p-2 hover:bg-chip">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {card(t("totals.net"), totals.net, "text-primary")}
        {card(t("totals.paid"), totals.paid, "text-emerald-600")}
        {card(t("totals.unpaid"), totals.unpaid, "text-amber-600")}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground">{t("totals.count")}</p>
          <p className="mt-1 font-display text-2xl text-foreground">{totals.count}</p>
        </div>
      </div>

      {!loading && members.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {missing.length > 0 && (
            <Btn onClick={() => void generate()} disabled={busy === "generate"}>
              {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />} {t("generate")}
            </Btn>
          )}
          <Btn variant="outline" onClick={() => open("new")}><Plus className="h-4 w-4" /> {t("addOne")}</Btn>
          {withoutSalary > 0 && <p className="text-xs text-muted-foreground">{t("noSalaryHint", { count: withoutSalary })}</p>}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-xl text-primary">{t("noTeamTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noTeamBody")}</p>
            <Link href="/portal/team" className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {t("openTeam")}
            </Link>
          </div>
        ) : slips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Wallet className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-xl text-primary">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{t("columns.member")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.basic")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.additions")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.deductions")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("columns.net")}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t("columns.status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {slips.map((s, i) => (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                      className="border-t border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={null} name={s.member_name} className="h-9 w-9" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{s.member_name}</p>
                            <p className="text-xs text-muted-foreground">{tt(`roles.${s.member_role as "assistant"}.one`)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(s.basic))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(s.allowance) + Number(s.bonus))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive/80">{formatCurrency(Number(s.deduction) + Number(s.advance))}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(Number(s.net))}</td>
                      <td className="px-4 py-3">
                        <Pill tone={s.status === "paid" ? "ok" : "warn"}>{t(`statuses.${s.status}`)}</Pill>
                        {s.status === "paid" && s.paid_on && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("paidOn", { date: formatDate(s.paid_on), method: t(`methods.${s.payment_method ?? "cash"}`) })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          {s.status === "paid" ? (
                            <button type="button" onClick={() => void unpay(s)} disabled={busy === s.id} title={t("unpay")} aria-label={t("unpay")}
                              className="rounded-lg p-1.5 text-foreground/70 hover:bg-muted disabled:opacity-50">
                              {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                            </button>
                          ) : (
                            <Btn onClick={() => { setPaying(s); setPayMethod("cash"); setPaidOn(today()); }} disabled={busy === s.id} className="h-8 px-3 text-xs">
                              {t("pay")}
                            </Btn>
                          )}
                          <button type="button" onClick={() => print(s)} title={t("print")} aria-label={t("print")} className="rounded-lg p-1.5 text-foreground/70 hover:bg-muted">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => open(s)} title={t("edit")} aria-label={t("edit")} className="rounded-lg p-1.5 text-foreground/70 hover:bg-muted">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {s.status !== "paid" && (
                            <button type="button" onClick={() => setRemoving(s)} disabled={busy === s.id} title={t("remove")} aria-label={t("remove")}
                              className="rounded-lg p-1.5 text-destructive/80 hover:bg-destructive/10 disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => busy !== "save" && setEditing(null)}
        title={editingSlip ? t("editTitle", { name: editingSlip.member_name }) : t("addOne")}
        footer={<>
          <Btn variant="outline" onClick={() => setEditing(null)} disabled={busy === "save"}>{tc("cancel")}</Btn>
          <Btn onClick={() => void save()} disabled={busy === "save"}>
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} {tc("save")}
          </Btn>
        </>}>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            {editing === "new" && (
              <div className="sm:col-span-2">
                <Field label={t("fields.member")} required>
                  <Select value={draft.member_id} onChange={e => {
                    const member = members.find(m => m.id === e.target.value);
                    setDraft(d => (d ? { ...d, member_id: e.target.value, basic: member?.monthly_salary ?? d.basic } : d));
                  }}>
                    <option value="">{t("pickMember")}</option>
                    {members.filter(m => !slips.some(s => s.member_id === m.id)).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            {locked && <p className="sm:col-span-2 text-xs text-amber-700">{t("paidLocked")}</p>}
            {PAYSLIP_AMOUNTS.map(key => (
              <Field key={key} label={t(`fields.${key}`)}>
                <Input type="number" min={0} step="0.01" inputMode="decimal" disabled={locked}
                  value={draft[key] === 0 ? "" : String(draft[key])} placeholder="0"
                  onChange={e => setAmount(key, e.target.value)} />
              </Field>
            ))}
            <div className="flex flex-col justify-end rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("fields.net")}</p>
              <p className="font-display text-2xl text-primary">{formatCurrency(netOf(draft))}</p>
            </div>
            <div className="sm:col-span-2">
              <Field label={t("fields.notes")}>
                <TextArea value={draft.notes} onChange={e => setDraft(d => (d ? { ...d, notes: e.target.value } : d))} />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!paying} onClose={() => setPaying(null)} title={paying ? t("payTitle", { name: paying.member_name }) : ""}
        footer={<>
          <Btn variant="outline" onClick={() => setPaying(null)}>{tc("cancel")}</Btn>
          <Btn onClick={() => void pay()} disabled={!!paying && busy === paying.id}>
            {paying && busy === paying.id && <Loader2 className="h-4 w-4 animate-spin" />} {t("pay")}
          </Btn>
        </>}>
        {paying && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{t("fields.net")}</p>
              <p className="font-display text-2xl text-primary">{formatCurrency(Number(paying.net))}</p>
            </div>
            <Field label={t("fields.method")}>
              <Select value={payMethod} onChange={e => setPayMethod(e.target.value as PayrollMethod)}>
                {PAYROLL_METHODS.map(m => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
              </Select>
            </Field>
            <Field label={t("fields.paidOn")}>
              <Input type="date" value={paidOn} max={today()} onChange={e => setPaidOn(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && void remove(removing)}
        title={removing ? t("removeTitle", { name: removing.member_name }) : ""}
        description={t("removeBody")}
      />
    </PortalLayout>
  );
};

export default Payroll;
