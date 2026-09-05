"use client";

import { useMemo, useState } from "react";
import { Btn } from "@/components/admin/ui";
import { Modal, Field, Input, TextArea, Select } from "@/components/admin/crud";
import { WORK_ORDER_STATUSES, type WorkOrderItem } from "@/server/resources/workOrders";

/**
 * The work order form, in the order the paper form reads.
 *
 * Header, who it is billed to, the job, the priced lines, then the totals and
 * the terms — the same sequence as the sheet the finance desk fills in today,
 * so somebody moving from one to the other is not hunting for fields.
 *
 * Totals are computed here and posted with the row. They are stored rather
 * than derived (0071) because a work order is signed: the figures on it are
 * what both sides agreed on the day, not what a later version of this file
 * would recompute.
 */

/** A blank line. `unit` and `unit_price` are strings while being typed. */
type DraftItem = { qty: string; description: string; unit: string; unit_price: string };

const blankItem = (): DraftItem => ({ qty: "", description: "", unit: "", unit_price: "" });

/** The four terms the sheet carries by default. Edited per order. */
const DEFAULT_TERMS = [
  "1. 50% advance payment during signature of Work Order.",
  "2. Rest of the 50% payable at the time of product delivery.",
  "3. Advance will be adjusted with the last or final delivery.",
  "4. Production process must follow this work order.",
].join("\n");

const money = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** A line's total. Blank fields count as zero rather than NaN. */
const lineTotal = (it: DraftItem) => (Number(it.unit) || 0) * (Number(it.unit_price) || 0);

export type WorkOrderSubmit = {
  reference: string;
  issued_on: string;
  requisition_id: string | null;
  requested_by: string;
  customer_code: string;
  department: string;
  job: string;
  bill_to_name: string;
  bill_to_contact: string;
  bill_to_address: string;
  bill_to_phone: string;
  items: WorkOrderItem[];
  subtotal: number;
  shipping: number;
  other: number;
  total: number;
  terms: string;
  status: string;
};

type RequisitionOption = {
  id: string;
  reference: string;
  title: string;
  department: string | null;
  stage: string;
  vendor_name?: string | null;
  vendors?: { name: string } | null;
};

export const WorkOrderModal = ({
  open,
  onClose,
  onSubmit,
  suggestedReference,
  requisitions,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: WorkOrderSubmit) => Promise<boolean>;
  suggestedReference: string;
  requisitions: RequisitionOption[];
  departments: string[];
}) => {
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [shipping, setShipping] = useState("");
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);

  // Choosing a requisition fills the header from it. Everything stays editable
  // afterwards — the figures on an order are usually negotiated after the
  // request was raised, which is the whole reason the two are separate rows.
  const [requisitionId, setRequisitionId] = useState("");
  const [department, setDepartment] = useState("");
  const [billTo, setBillTo] = useState("");
  const [job, setJob] = useState("");

  const chosen = requisitions.find(r => r.id === requisitionId);

  const applyRequisition = (id: string) => {
    setRequisitionId(id);
    const r = requisitions.find(x => x.id === id);
    if (!r) return;
    setDepartment(r.department ?? "");
    setBillTo(r.vendors?.name ?? r.vendor_name ?? "");
    setJob(r.title);
    setItems(prev => {
      const [first, ...rest] = prev;
      return [{ ...first, description: first.description || r.title }, ...rest];
    });
  };

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + lineTotal(it), 0), [items]);
  const total = subtotal + (Number(shipping) || 0) + (Number(other) || 0);

  const setItem = (i: number, patch: Partial<DraftItem>) =>
    setItems(prev => prev.map((it, n) => (n === i ? { ...it, ...patch } : it)));

  const reset = () => {
    setItems([blankItem()]);
    setShipping("");
    setOther("");
    setRequisitionId("");
    setDepartment("");
    setBillTo("");
    setJob("");
  };

  const close = () => { reset(); onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Create work order"
      footer={<>
        <Btn variant="outline" onClick={close}>Cancel</Btn>
        <button form="wo-form" type="submit" disabled={saving}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
          {saving ? "Saving…" : "Create work order"}
        </button>
      </>}
    >
      <form id="wo-form" onSubmit={async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        // A line with no description is an empty row the desk tabbed past, not
        // a line worth storing.
        const lines = items
          .filter(it => it.description.trim())
          .map(it => ({
            qty: it.qty.trim() || undefined,
            description: it.description.trim(),
            unit: Number(it.unit) || 0,
            unit_price: Number(it.unit_price) || 0,
          }));

        setSaving(true);
        const ok = await onSubmit({
          reference: String(fd.get("reference") || "").trim(),
          issued_on: String(fd.get("issued_on") || ""),
          requisition_id: requisitionId || null,
          requested_by: String(fd.get("requested_by") || "").trim(),
          customer_code: String(fd.get("customer_code") || "").trim(),
          department,
          job,
          bill_to_name: billTo,
          bill_to_contact: String(fd.get("bill_to_contact") || "").trim(),
          bill_to_address: String(fd.get("bill_to_address") || "").trim(),
          bill_to_phone: String(fd.get("bill_to_phone") || "").trim(),
          items: lines,
          subtotal,
          shipping: Number(shipping) || 0,
          other: Number(other) || 0,
          total,
          terms: String(fd.get("terms") || ""),
          status: String(fd.get("status") || "draft"),
        });
        setSaving(false);
        if (ok) close();
      }}>

        {/* ------------------------------------------------ the header --- */}
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="W.O. #" required>
            <Input name="reference" required defaultValue={suggestedReference} />
          </Field>
          <Field label="W.O. date" required>
            <Input name="issued_on" type="date" required
              defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Requested by">
            <Input name="requested_by" />
          </Field>
          <Field label="Customer ID">
            <Input name="customer_code" />
          </Field>
        </div>

        <Field label="Against requisition"
          hint={chosen ? `${chosen.reference} · ${chosen.title}` : "Optional — fills the header from an approved requisition"}>
          <Select value={requisitionId} onChange={e => applyRequisition(e.target.value)}>
            <option value="">Not raised from a requisition</option>
            {requisitions.map(r => (
              <option key={r.id} value={r.id}>{r.reference} — {r.title}</option>
            ))}
          </Select>
        </Field>

        <Field label="Department">
          <Select value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">—</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>

        {/* --------------------------------------------------- bill to --- */}
        <p className="mt-6 mb-2 text-[10px] tracking-widest font-bold text-muted-foreground">BILL TO / SHIP TO</p>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Name">
            <Input value={billTo} onChange={e => setBillTo(e.target.value)} />
          </Field>
          <Field label="Contact person">
            <Input name="bill_to_contact" />
          </Field>
          <Field label="Address">
            <Input name="bill_to_address" />
          </Field>
          <Field label="Phone">
            <Input name="bill_to_phone" />
          </Field>
        </div>

        <Field label="Job">
          <TextArea value={job} onChange={e => setJob(e.target.value)}
            placeholder="What is being made or supplied" />
        </Field>

        {/* ----------------------------------------------------- lines --- */}
        <p className="mt-6 mb-2 text-[10px] tracking-widest font-bold text-muted-foreground">LINES</p>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-border/60 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-4">
                  <label className="text-[10px] tracking-widest font-bold text-muted-foreground">QTY</label>
                  <Input value={it.qty} placeholder="2400 Bundle × 50 pcs"
                    onChange={e => setItem(i, { qty: e.target.value })} />
                </div>
                <div className="sm:col-span-8">
                  <label className="text-[10px] tracking-widest font-bold text-muted-foreground">DESCRIPTION</label>
                  <Input value={it.description}
                    onChange={e => setItem(i, { description: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] tracking-widest font-bold text-muted-foreground">UNIT (PCS)</label>
                  <Input type="number" min="0" step="1" value={it.unit}
                    onChange={e => setItem(i, { unit: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] tracking-widest font-bold text-muted-foreground">UNIT PRICE</label>
                  <Input type="number" min="0" step="0.01" value={it.unit_price}
                    onChange={e => setItem(i, { unit_price: e.target.value })} />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] tracking-widest font-bold text-muted-foreground">LINE TOTAL</label>
                  <p className="px-3 py-2 text-sm font-semibold text-primary">{money(lineTotal(it))}</p>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  {items.length > 1 && (
                    <Btn variant="ghost" onClick={() => setItems(prev => prev.filter((_, n) => n !== i))}>
                      Remove
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <Btn variant="outline" onClick={() => setItems(prev => [...prev, blankItem()])}>+ Add line</Btn>
        </div>

        {/* ---------------------------------------------------totals --- */}
        <div className="mt-6 sm:ml-auto sm:max-w-sm space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">SUBTOTAL</span>
            <b className="text-primary">{money(subtotal)}</b>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">S &amp; H</span>
            <Input type="number" min="0" step="0.01" value={shipping} className="max-w-[10rem]"
              onChange={e => setShipping(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">OTHER</span>
            <Input type="number" min="0" step="0.01" value={other} className="max-w-[10rem]"
              onChange={e => setOther(e.target.value)} />
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base">
            <span className="font-semibold text-primary">TOTAL</span>
            <b className="text-primary-glow">{money(total)}</b>
          </div>
        </div>

        {/* ----------------------------------------------------- terms --- */}
        <Field label="Other comments or special instructions">
          <TextArea name="terms" rows={5} defaultValue={DEFAULT_TERMS} />
        </Field>

        <Field label="Status">
          <Select name="status" defaultValue="draft">
            {WORK_ORDER_STATUSES.map(s => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
};
