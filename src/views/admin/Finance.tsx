"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Field, Input, Select, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { Wallet, TrendingUp, AlertCircle, Receipt } from "lucide-react";
import {
  financeTotals,
  invoiceStatus,
  invoiceStatusLabel,
  suggestReference,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/finance";

/** Taka, like every other money figure in the admin panel. */
const fmt = (n: number) => `৳${n.toLocaleString()}`;

const KIND_LABELS: Record<Invoice["kind"], string> = {
  receivable: "Receivable",
  payable: "Payable",
};

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
    push({ title: `${invoice.reference} marked paid`, tone: "ok" });
  };

  /** The way back from a mis-click, since paid_at is the only status there is. */
  const markUnpaid = async (invoice: Invoice) => {
    await crud.update(invoice.id, { paid_at: null });
    push({ title: `${invoice.reference} reopened`, tone: "info" });
  };

  const cols: Column<Invoice>[] = [
    { key: "reference", label: "Invoice", sortable: true, accessor: r => r.reference,
      render: r => <span className="font-mono text-xs">{r.reference}</span> },
    { key: "party", label: "Party", sortable: true, accessor: r => r.party,
      render: r => <span className="font-semibold text-primary">{r.party}</span> },
    { key: "kind", label: "Type", render: r => KIND_LABELS[r.kind] },
    { key: "amount", label: "Amount", sortable: true, accessor: r => Number(r.amount),
      render: r => fmt(Number(r.amount)) },
    { key: "due_date", label: "Due", sortable: true, accessor: r => r.due_date },
    { key: "status", label: "Status", accessor: r => invoiceStatus(r),
      render: r => {
        const value = invoiceStatus(r);
        return <Pill tone={STATUS_TONE[value]}>{invoiceStatusLabel(value)}</Pill>;
      } },
  ];

  return (
    <AdminLayout title="Finance" subtitle="Invoices, payments and approvals">
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Wallet} label="Receivables" value={fmt(totals.receivables)} />
        <Kpi icon={Receipt} label="Payables" value={fmt(totals.payables)} tone="chip" />
        <Kpi icon={AlertCircle} label="Overdue" value={fmt(totals.overdue)} tone="destructive" />
        {/* Was the string "$184K", which never moved whatever the hospital did. */}
        <Kpi icon={TrendingUp} label="Revenue this month" value={fmt(totals.revenueThisMonth)} tone="accent" />
      </div>

      <Card className="p-5">
        <Toolbar
          search={q}
          onSearch={setQ}
          onAdd={() => setAdd(true)}
          addLabel="New Invoice"
          onExport={() => exportCSV(rows as never, "finance.csv")}
          filters={
            <select
              value={status}
              onChange={e => setStatus(e.target.value as "all" | InvoiceStatus)}
              className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          }
        />

        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load invoices.</p>
            <p className="text-xs text-muted-foreground mt-1">
              You may not have access to this module, or the request failed.
            </p>
            <button
              type="button"
              onClick={() => crud.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <DataTable<Invoice>
            rows={rows}
            columns={cols}
            empty="No invoices yet. Create one to get started."
            actions={r => (
              <RowActions
                extra={
                  r.paid_at
                    ? <Btn variant="ghost" onClick={() => void markUnpaid(r)}>Mark Unpaid</Btn>
                    : <Btn variant="ghost" onClick={() => void markPaid(r)}>Mark Paid</Btn>
                }
                onDelete={() => void crud.remove(r.id)}
              />
            )}
          />
        )}
      </Card>

      <Modal
        open={add}
        onClose={() => setAdd(false)}
        title="New invoice"
        footer={<>
          <Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="inv-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Create</button>
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
          <Field label="Reference" required>
            <Input name="reference" required defaultValue={suggestReference(invoices)} />
          </Field>
          <Field label="Party" required><Input name="party" required /></Field>
          <Field label="Type">
            <Select name="kind">
              <option value="receivable">Receivable</option>
              <option value="payable">Payable</option>
            </Select>
          </Field>
          <Field label="Amount (৳)" required><Input name="amount" type="number" min="0" step="0.01" required /></Field>
          <Field label="Due date" required><Input name="due_date" type="date" required /></Field>
          <Field label="Patient (optional)">
            <Select name="patient_id" defaultValue="">
              <option value="">Not a patient bill</option>
              {patients.items.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Choosing a patient makes this invoice visible to them in their portal.
            </p>
          </Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};
export default Finance;
