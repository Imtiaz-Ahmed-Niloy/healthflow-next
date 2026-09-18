"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Field, Input, Select, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { Wallet, TrendingUp, AlertCircle, Receipt } from "lucide-react";
import { useFormatters } from "@/lib/appSettings";
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
  const { formatCurrency: fmt } = useFormatters();
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
