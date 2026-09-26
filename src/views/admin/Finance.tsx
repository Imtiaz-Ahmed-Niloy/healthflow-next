"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Field, Input, Select, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { Wallet, TrendingUp, AlertCircle, Receipt, Printer } from "lucide-react";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import type { BillLine } from "@/redux/api/resources";
import {
  financeTotals,
  invoiceStatus,
  suggestReference,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance";

/**
 * Tones are chosen here rather than through statusTone(): overdue is the one
 * status on this page that has to read as a problem, and it is derived, so it
 * never reaches the shared helper as a stored value.
 */
const STATUS_TONE: Record<InvoiceStatus, "ok" | "warn" | "bad"> = {
  paid: "ok",
  pending: "warn",
  overdue: "bad",
};

type PatientOption = { id: string; full_name: string };

const Finance = () => {
  const t = useTranslations("admin.finance");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const { formatCurrency: fmt, formatDate } = useFormatters();
  const crud = useResourceCrud<Invoice>("finance-invoices");
  // Attaching a patient is what puts the invoice on their /patient/billing
  // page (HF-77). Optional: a vendor payable or an insurer receivable has no
  // patient behind it.
  const patients = useResourceCrud<PatientOption>("patients");
  const { push } = useNotifications();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [add, setAdd] = useState(false);

  const invoices = crud.items;
  const totals = useMemo(() => financeTotals(invoices), [invoices]);

  const rows = invoices.filter(invoice => {
    if (status !== "all" && invoiceStatus(invoice) !== status) return false;
    if (!q) return true;
    const term = q.toLowerCase();
    return `${invoice.party} ${invoice.reference}`.toLowerCase().includes(term);
  });

  const markPaid = async (invoice: Invoice) => {
    await crud.update(invoice.id, { paid_at: new Date().toISOString() });
    push({ title: t("markedPaid", { reference: invoice.reference }), tone: "ok" });
  };

  /** The way back from a mis-click, since paid_at is the only status there is. */
  const markUnpaid = async (invoice: Invoice) => {
    await crud.update(invoice.id, { paid_at: null });
    push({ title: t("reopened", { reference: invoice.reference }), tone: "info" });
  };

  /**
   * One invoice as a sheet of its own, in a new window, as the attendance
   * sheet prints. Its line items when it has them (a discharge bill does,
   * 0080); otherwise one line from the description. Party names and
   * descriptions are typed by staff, so everything is escaped.
   */
  const printInvoice = (r: Invoice) => {
    const w = window.open("", "_blank", "width=900,height=900");
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    const amount = Number(r.amount);
    const lines: BillLine[] = Array.isArray(r.line_items) && r.line_items.length
      ? (r.line_items as unknown as BillLine[])
      : [{ description: r.description || t(`kinds.${r.kind}`), quantity: 1, rate: amount, amount }];
    const value = invoiceStatus(r);
    const color = value === "paid" ? "#059669" : value === "overdue" ? "#dc2626" : "#d97706";
    const body = lines.map(l => `<tr><td>${esc(l.description)}</td><td class="num">${l.quantity}</td>`
      + `<td class="num">${esc(fmt(Number(l.rate)))}</td><td class="num">${esc(fmt(Number(l.amount)))}</td></tr>`).join("");
    w.document.write(`<html><head><title>${esc(`${t("print.title")} ${r.reference}`)}</title>
      <style>body{font-family:system-ui;padding:40px;color:#111;max-width:760px;margin:0 auto}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px}
      h1{margin:0;font-size:28px}.brand{font-weight:700;font-size:18px}.muted{color:#666;font-size:12px}
      .meta{display:flex;justify-content:space-between;margin:24px 0;font-size:13px;gap:24px}.meta b{display:block;font-size:11px;color:#666;font-weight:600;margin-bottom:2px}
      table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}
      th{background:#f3f4f6;font-size:11px}.num{text-align:right;white-space:nowrap}tfoot td{font-weight:700;font-size:15px;border-bottom:none}</style>
      </head><body>
      <div class="head">
        <div><div class="brand">${esc(BRAND_INFO.name)}</div></div>
        <div style="text-align:right"><h1>${esc(t("print.title"))}</h1><div class="muted">${esc(r.reference)}</div>
          <div style="color:${color};font-weight:700;margin-top:4px">${esc(t(`statuses.${value}`))}</div></div>
      </div>
      <div class="meta">
        <div><b>${esc(t("columns.party"))}</b>${esc(r.party)}</div>
        <div><b>${esc(t("columns.type"))}</b>${esc(t(`kinds.${r.kind}`))}</div>
        <div><b>${esc(t("print.issued"))}</b>${esc(formatDate(r.created_at))}</div>
        <div><b>${esc(t("columns.due"))}</b>${esc(formatDate(r.due_date))}</div>
      </div>
      <table><thead><tr><th>${esc(t("print.item"))}</th><th class="num">${esc(t("print.qty"))}</th>
        <th class="num">${esc(t("print.rate"))}</th><th class="num">${esc(t("columns.amount"))}</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><td colspan="3">${esc(t("print.total"))}</td><td class="num">${esc(fmt(amount))}</td></tr></tfoot></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  const cols: Column<Invoice>[] = [
    { key: "reference", label: t("columns.invoice"), sortable: true, accessor: r => r.reference,
      render: r => <span className="font-mono text-xs">{r.reference}</span> },
    { key: "party", label: t("columns.party"), sortable: true, accessor: r => r.party,
      render: r => <span className="font-semibold text-primary">{r.party}</span> },
    { key: "kind", label: t("columns.type"), render: r => t(`kinds.${r.kind}`) },
    { key: "amount", label: t("columns.amount"), sortable: true, accessor: r => Number(r.amount),
      render: r => fmt(Number(r.amount)) },
    { key: "due_date", label: t("columns.due"), sortable: true, accessor: r => r.due_date },
    { key: "status", label: t("columns.status"), accessor: r => invoiceStatus(r),
      render: r => {
        const value = invoiceStatus(r);
        return <Pill tone={STATUS_TONE[value]}>{t(`statuses.${value}`)}</Pill>;
      } },
  ];

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Wallet} label={t("kpi.receivables")} value={fmt(totals.receivables)} />
        <Kpi icon={Receipt} label={t("kpi.payables")} value={fmt(totals.payables)} tone="chip" />
        <Kpi icon={AlertCircle} label={t("kpi.overdue")} value={fmt(totals.overdue)} tone="destructive" />
        {/* Was the string "$184K", which never moved whatever the hospital did. */}
        <Kpi icon={TrendingUp} label={t("kpi.revenue")} value={fmt(totals.revenueThisMonth)} tone="accent" />
      </div>

      <Card className="p-5">
        <Toolbar
          search={q}
          onSearch={setQ}
          onAdd={() => setAdd(true)}
          addLabel={t("newInvoice")}
          onExport={() => exportCSV(rows as never, "finance.csv")}
          filters={
            <select
              value={status}
              onChange={e => setStatus(e.target.value as "all" | InvoiceStatus)}
              className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none"
              aria-label={t("columns.status")}
            >
              <option value="all">{t("all")}</option>
              <option value="pending">{t("statuses.pending")}</option>
              <option value="paid">{t("statuses.paid")}</option>
              <option value="overdue">{t("statuses.overdue")}</option>
            </select>
          }
        />

        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">{t("loadFailed")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("loadFailedHint")}</p>
            <button
              type="button"
              onClick={() => crud.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        ) : (
          <DataTable<Invoice>
            rows={rows}
            columns={cols}
            empty={t("empty")}
            actions={r => (
              <RowActions
                before={
                  <button type="button" onClick={() => printInvoice(r)} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70" title={t("print.button")} aria-label={t("print.button")}>
                    <Printer className="h-4 w-4" />
                  </button>
                }
                extra={
                  r.paid_at
                    ? <Btn variant="ghost" onClick={async () => { if (await confirmAction(t("markUnpaid"), { name: r.reference })) void markUnpaid(r); }}>{t("markUnpaid")}</Btn>
                    : <Btn variant="ghost" onClick={async () => { if (await confirmAction(t("markPaid"), { name: r.reference })) void markPaid(r); }}>{t("markPaid")}</Btn>
                }
                onDelete={async () => { if (await confirmAction(tc("delete"), { name: r.reference, danger: true })) void crud.remove(r.id); }}
              />
            )}
          />
        )}
      </Card>

      <Modal
        open={add}
        onClose={() => setAdd(false)}
        title={t("newInvoiceTitle")}
        footer={<>
          <Btn variant="outline" onClick={() => setAdd(false)}>{tc("cancel")}</Btn>
          <button form="inv-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{t("create")}</button>
        </>}
      >
        <form id="inv-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const created = await crud.create({
            reference: String(fd.get("reference") || "").trim(),
            party: String(fd.get("party") || "").trim(),
            kind: String(fd.get("kind")) as Invoice["kind"],
            amount: Number(fd.get("amount")),
            due_date: String(fd.get("due_date")),
            patient_id: String(fd.get("patient_id") || "") || null,
          } as never);
          // useResourceCrud has already surfaced the error, including the one
          // that matters here: a reference this hospital has used before.
          if (!created) return;
          setAdd(false);
        }}>
          <Field label={t("fields.reference")} required>
            <Input name="reference" required defaultValue={suggestReference(invoices)} />
          </Field>
          <Field label={t("fields.party")} required><Input name="party" required /></Field>
          <Field label={t("fields.type")}>
            <Select name="kind">
              <option value="receivable">{t("kinds.receivable")}</option>
              <option value="payable">{t("kinds.payable")}</option>
            </Select>
          </Field>
          <Field label={t("fields.amount")} required><Input name="amount" type="number" min="0" step="0.01" required /></Field>
          <Field label={t("fields.dueDate")} required><Input name="due_date" type="date" required /></Field>
          <Field label={t("fields.patient")}>
            <Select name="patient_id" defaultValue="">
              <option value="">{t("notAPatientBill")}</option>
              {patients.items.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{t("patientHint")}</p>
          </Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};
export default Finance;
