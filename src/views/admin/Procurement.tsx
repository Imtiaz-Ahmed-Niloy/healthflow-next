"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { useCrud, Modal, Field, Input, Select } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";

type Req = { id: string; title: string; dept: string; vendor: string; amount: string; stage: string };
const stages = ["Pending", "Approved", "Ordered", "Delivered"] as const;
const seed: Req[] = [
  { id: "REQ-3041", title: "Surgical Gloves x500", dept: "OT", vendor: "Vendor A", amount: "1200", stage: "Pending" },
  { id: "REQ-3042", title: "MRI Contrast Agent", dept: "Radiology", vendor: "Vendor C", amount: "4500", stage: "Pending" },
  { id: "REQ-3038", title: "Office Stationery", dept: "Admin", vendor: "Vendor B", amount: "320", stage: "Approved" },
  { id: "REQ-3035", title: "Hospital Beds x10", dept: "Ward 3B", vendor: "Vendor D", amount: "18000", stage: "Ordered" },
  { id: "REQ-3030", title: "Pharmacy Restock", dept: "Pharmacy", vendor: "Vendor A", amount: "9800", stage: "Delivered" },
];

const Procurement = () => {
  const crud = useCrud<Req>("procurement", seed);
  const { push } = useNotifications();
  const [add, setAdd] = useState(false);
  const [view, setView] = useState<Req | null>(null);

  const advance = (r: Req) => {
    const i = stages.indexOf(r.stage as never);
    if (i < stages.length - 1) {
      const next = stages[i + 1];
      crud.update(r.id, { stage: next });
      push({ title: `${r.id} → ${next}`, tone: "info" });
    }
  };
  const reject = (r: Req) => { crud.remove(r.id); push({ title: `${r.id} rejected`, tone: "bad" }); };

  return (
    <AdminLayout title="Procurement (Requisition)" subtitle="Approve, order and track delivery">
      <div className="flex justify-end mb-4"><Btn onClick={() => setAdd(true)}>+ New Requisition</Btn></div>
      <div className="grid md:grid-cols-4 gap-4">
        {stages.map(s => {
          const items = crud.items.filter(i => i.stage === s);
          return (
            <div key={s}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg text-primary">{s}</p>
                <Pill tone={s === "Delivered" ? "ok" : s === "Pending" ? "warn" : "info"}>{items.length}</Pill>
              </div>
              <div className="space-y-3">
                {items.map(it => (
                  <Card key={it.id} className="p-4">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{it.id}</p>
                    <p className="font-semibold text-primary mt-1">{it.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{it.dept} · {it.vendor}</p>
                    <p className="text-sm font-semibold text-primary-glow mt-2">${Number(it.amount).toLocaleString()}</p>
                    <div className="mt-3 flex gap-2">
                      <Btn variant="ghost" onClick={() => setView(it)}>View</Btn>
                      {it.stage !== "Delivered" && <Btn onClick={() => advance(it)}>Advance →</Btn>}
                      {it.stage === "Pending" && <Btn variant="danger" onClick={() => reject(it)}>Reject</Btn>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="New requisition"
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>Cancel</Btn>
          <button form="req-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Submit</button></>}>
        <form id="req-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          crud.create({
            id: `REQ-${3050 + crud.items.length}`,
            title: String(fd.get("title")), dept: String(fd.get("dept")),
            vendor: String(fd.get("vendor")), amount: String(fd.get("amount")), stage: "Pending"
          } as never);
          push({ title: `New requisition: ${fd.get("title")}`, tone: "info" });
          setAdd(false);
        }}>
          <Field label="Item / title" required><Input name="title" required /></Field>
          <Field label="Department"><Select name="dept"><option>OT</option><option>Radiology</option><option>Admin</option><option>Pharmacy</option><option>Ward 3B</option></Select></Field>
          <Field label="Vendor"><Select name="vendor"><option>Vendor A</option><option>Vendor B</option><option>Vendor C</option><option>Vendor D</option></Select></Field>
          <Field label="Amount (USD)" required><Input name="amount" type="number" required /></Field>
        </form>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.id || ""}>
        {view && <div className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Item:</span> <b>{view.title}</b></p>
          <p><span className="text-muted-foreground">Department:</span> {view.dept}</p>
          <p><span className="text-muted-foreground">Vendor:</span> {view.vendor}</p>
          <p><span className="text-muted-foreground">Amount:</span> ${view.amount}</p>
          <p><span className="text-muted-foreground">Stage:</span> <Pill>{view.stage}</Pill></p>
        </div>}
      </Modal>
    </AdminLayout>
  );
};
export default Procurement;

