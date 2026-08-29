"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { useCrud, DataTable, Toolbar, Modal, Field, Input, Select, statusTone, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { Wallet, TrendingUp, AlertCircle, Receipt } from "lucide-react";

type Inv = { id: string; party: string; type: string; amount: string; due: string; status: string };
const seed: Inv[] = [
  { id: "INV-A-1001", party: "MetLife Insurance", type: "Receivable", amount: "12000", due: "2026-05-12", status: "Pending" },
  { id: "INV-A-1002", party: "Vendor A", type: "Payable", amount: "9800", due: "2026-05-08", status: "Paid" },
  { id: "INV-A-1003", party: "Cigna Insurance", type: "Receivable", amount: "6500", due: "2026-04-30", status: "Overdue" },
  { id: "INV-A-1004", party: "Vendor C", type: "Payable", amount: "4500", due: "2026-05-20", status: "Pending" },
];

const Finance = () => {
  const crud = useCrud<Inv>("finance", seed);
  const { push } = useNotifications();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [add, setAdd] = useState(false);
  const cols: Column<Inv>[] = [
    { key: "id", label: "Invoice", render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "party", label: "Party", sortable: true, accessor: r => r.party, render: r => <span className="font-semibold text-primary">{r.party}</span> },
    { key: "type", label: "Type" },
    { key: "amount", label: "Amount", sortable: true, accessor: r => Number(r.amount), render: r => `$${Number(r.amount).toLocaleString()}` },
    { key: "due", label: "Due", sortable: true, accessor: r => r.due },
    { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
  ];
  const rows = crud.items.filter(i =>
    (status === "all" || i.status === status) &&
    (!q || (i.party + i.id).toLowerCase().includes(q.toLowerCase()))
  );
  const recv = crud.items.filter(i => i.type === "Receivable" && i.status === "Pending").reduce((s, i) => s + Number(i.amount), 0);
  const pay = crud.items.filter(i => i.type === "Payable" && i.status === "Pending").reduce((s, i) => s + Number(i.amount), 0);
  const overdue = crud.items.filter(i => i.status === "Overdue").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <AdminLayout title="Finance" subtitle="Invoices, payments and approvals">
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Wallet} label="Receivables" value={`$${recv.toLocaleString()}`} />
        <Kpi icon={Receipt} label="Payables" value={`$${pay.toLocaleString()}`} tone="chip" />
        <Kpi icon={AlertCircle} label="Overdue" value={`$${overdue.toLocaleString()}`} tone="destructive" />
        <Kpi icon={TrendingUp} label="MTD Revenue" value="$184K" trend="+12%" tone="accent" />
      </div>
      <Card className="p-5">
        <Toolbar search={q} onSearch={setQ}
          onAdd={() => setAdd(true)} addLabel="New Invoice"
          onExport={() => exportCSV(rows as never, "finance.csv")}
          filters={<select value={status} onChange={e => setStatus(e.target.value)} className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none">
            <option value="all">All</option><option>Pending</option><option>Paid</option><option>Overdue</option>
          </select>}
        />
        <DataTable<Inv> rows={rows} columns={cols}
          actions={r => <RowActions
            extra={r.status !== "Paid" && <Btn variant="ghost" onClick={() => { crud.update(r.id, { status: "Paid" }); push({ title: `${r.id} marked paid`, tone: "ok" }); }}>Mark Paid</Btn>}
            onDelete={() => crud.remove(r.id)}
          />}
        />
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title="New invoice"
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="inv-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Create</button></>}>
        <form id="inv-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          crud.create({ id: `INV-A-${1100 + crud.items.length}`, party: String(fd.get("party")), type: String(fd.get("type")), amount: String(fd.get("amount")), due: String(fd.get("due")), status: "Pending" } as never);
          setAdd(false);
        }}>
          <Field label="Party" required><Input name="party" required /></Field>
          <Field label="Type"><Select name="type"><option>Receivable</option><option>Payable</option></Select></Field>
          <Field label="Amount" required><Input name="amount" type="number" required /></Field>
          <Field label="Due date" required><Input name="due" type="date" required /></Field>
        </form>
      </Modal>
    </AdminLayout>
  );
};
export default Finance;

