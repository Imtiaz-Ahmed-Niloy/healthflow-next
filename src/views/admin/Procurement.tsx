"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill } from "@/components/admin/ui";
import { Modal, Field, Input, Select } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { WorkOrderModal } from "@/components/admin/WorkOrderModal";
import { useFormatters } from "@/lib/appSettings";
import type { Tables } from "@/lib/supabase/types";

/**
 * A requisition, with the vendor name the resource embeds (0048). Column names
 * are the database's, so form values post straight through. Postgres `numeric`
 * arrives over the wire as a string, hence the union on amount.
 */
type Requisition = Omit<Tables<"procurement_requisitions">, "amount"> & {
  amount: number | string;
  vendors?: { name: string } | null;
};

type VendorOption = { id: string; name: string; status: string };

/** Only what this page needs off a work order: its number, to suggest the next. */
type WorkOrderRow = { id: string; reference: string };

/**
 * The board's four columns. `rejected` is deliberately not one of them — it is
 * not a stage of the journey, it is where the journey stopped.
 */
const FLOW = ["pending", "approved", "ordered", "delivered"] as const;
type Stage = (typeof FLOW)[number];

/** Every stage a requisition can be in, including the one off the board. */
const STAGES = ["pending", "approved", "ordered", "delivered", "rejected"] as const;

const DEPARTMENTS = ["OT", "Radiology", "Admin", "Pharmacy", "Laboratory", "Ward", "Other"];

/** "REQ-3051", numbered within the hospital. The unique index catches a clash. */
const suggestReference = (rows: Requisition[]) => {
  const used = rows
    .map(r => Number(r.reference.trim().toUpperCase().replace(/^REQ-/, "")))
    .filter(Number.isFinite);
  return `REQ-${used.length ? Math.max(...used) + 1 : 3001}`;
};

/** The same, for work orders (0071), which carry their own series. */
const suggestWorkOrderReference = (rows: { reference: string }[]) => {
  const used = rows
    .map(r => Number(r.reference.trim().toUpperCase().replace(/^WO-/, "")))
    .filter(Number.isFinite);
  return `WO-${used.length ? Math.max(...used) + 1 : 1001}`;
};

const Procurement = () => {
  const t = useTranslations("admin.procurement");
  const tc = useTranslations("common");
  const { formatCurrency } = useFormatters();
  const fmt = (n: number | string) => formatCurrency(Number(n));
  const stageLabel = (value: string) =>
    (STAGES as readonly string[]).includes(value) ? t(`stages.${value as (typeof STAGES)[number]}`) : value;

  const crud = useResourceCrud<Requisition>("procurement-requisitions");
  // The vendor register (0030). A requisition is bought from someone.
  const vendors = useResourceCrud<VendorOption>("vendors");
  // The orders raised from these requisitions (0071).
  const workOrders = useResourceCrud<WorkOrderRow>("work-orders");
  const { push, notify } = useNotifications();

  const [add, setAdd] = useState(false);
  const [workOrder, setWorkOrder] = useState(false);
  const [view, setView] = useState<Requisition | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const rows = crud.items;
  const rejected = rows.filter(r => r.stage === "rejected");
  const activeVendors = vendors.items.filter(v => v.status === "active");

  const advance = async (r: Requisition) => {
    const i = FLOW.indexOf(r.stage as Stage);
    if (i < 0 || i >= FLOW.length - 1) return;
    const next = FLOW[i + 1];
    await crud.update(r.id, { stage: next } as never);
    push({ title: `${r.reference} → ${stageLabel(next)}`, tone: "info" });
  };

  /**
   * Rejecting records the decision. It used to delete the row, which threw
   * away exactly the thing a hospital needs later: who asked, for how much,
   * and that it was refused.
   */
  const reject = async (r: Requisition) => {
    await crud.update(r.id, { stage: "rejected" } as never);
    push({ title: t("rejectedToast", { reference: r.reference }), tone: "bad" });
  };

  const reopen = async (r: Requisition) => {
    await crud.update(r.id, { stage: "pending" } as never);
    push({ title: t("reopenedToast", { reference: r.reference }), tone: "info" });
  };

  const card = (it: Requisition, actions: React.ReactNode) => (
    <Card key={it.id} className="p-4">
      <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{it.reference}</p>
      <p className="font-semibold text-primary mt-1">{it.title}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {[it.department, it.vendors?.name ?? it.vendor_name].filter(Boolean).join(" · ") || "—"}
      </p>
      <p className="text-sm font-semibold text-primary-glow mt-2">{fmt(it.amount)}</p>
      <div className="mt-3 flex gap-2 flex-wrap">{actions}</div>
    </Card>
  );

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="flex justify-end gap-2 mb-4">
        <Btn variant="outline" onClick={() => setWorkOrder(true)}>{t("createWorkOrder")}</Btn>
        <Btn onClick={() => setAdd(true)}>{t("newRequisition")}</Btn>
      </div>

      {crud.error ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-destructive">{t("loadFailed")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("loadFailedHint")}</p>
          <button type="button" onClick={() => crud.refetch()}
            className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">
            {t("tryAgain")}
          </button>
        </Card>
      ) : crud.isLoading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">{tc("loading")}</Card>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            {FLOW.map(stage => {
              const items = rows.filter(i => i.stage === stage);
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display text-lg text-primary">{stageLabel(stage)}</p>
                    <Pill tone={stage === "delivered" ? "ok" : stage === "pending" ? "warn" : "info"}>
                      {items.length}
                    </Pill>
                  </div>
                  <div className="space-y-3">
                    {items.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1">{t("nothingHere")}</p>
                    )}
                    {items.map(it => card(it, <>
                      <Btn variant="ghost" onClick={() => setView(it)}>{t("view")}</Btn>
                      {it.stage !== "delivered" && <Btn onClick={() => void advance(it)}>{t("advance")}</Btn>}
                      {it.stage === "pending" && <Btn variant="danger" onClick={() => void reject(it)}>{t("reject")}</Btn>}
                    </>))}
                  </div>
                </div>
              );
            })}
          </div>

          {rejected.length > 0 && (
            <div className="mt-8">
              <button onClick={() => setShowRejected(v => !v)}
                className="text-sm font-semibold text-primary hover:underline">
                {showRejected ? t("hideRejected", { count: rejected.length }) : t("showRejected", { count: rejected.length })}
              </button>
              {showRejected && (
                <div className="grid md:grid-cols-4 gap-4 mt-4">
                  {rejected.map(it => card(it, <>
                    <Btn variant="ghost" onClick={() => setView(it)}>{t("view")}</Btn>
                    <Btn variant="outline" onClick={() => void reopen(it)}>{t("reopen")}</Btn>
                  </>))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={add} onClose={() => setAdd(false)} title={t("newRequisitionTitle")}
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>{tc("cancel")}</Btn>
          <button form="req-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("submit")}</button></>}>
        <form id="req-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const vendorId = String(fd.get("vendor_id") || "");
          const vendor = activeVendors.find(v => v.id === vendorId);

          const created = await crud.create({
            reference: String(fd.get("reference") || "").trim(),
            title: String(fd.get("title") || "").trim(),
            department: String(fd.get("department") || "") || null,
            vendor_id: vendor?.id ?? null,
            // Snapshot the name as displayed, so a delivered order still reads
            // correctly if the vendor is later removed.
            vendor_name: vendor?.name ?? null,
            amount: Number(fd.get("amount")),
          } as never);
          if (!created) return; // useResourceCrud has surfaced the error
          push({ title: t("newRequisitionToast", { title: String(fd.get("title") ?? "") }), tone: "info" });
          setAdd(false);
        }}>
          <Field label={t("fields.reference")} required>
            <Input name="reference" required defaultValue={suggestReference(rows)} />
          </Field>
          <Field label={t("fields.item")} required><Input name="title" required /></Field>
          <Field label={t("fields.department")}>
            <Select name="department">
              <option value="">—</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.vendor")}>
            <Select name="vendor_id">
              <option value="">{t("notChosen")}</option>
              {activeVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.amount")} required>
            <Input name="amount" type="number" min="0" step="0.01" required />
          </Field>
          {activeVendors.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">{t("noVendors")}</p>
          )}
        </form>
      </Modal>

      {/* An order is raised against an approved requisition, so those are what
          the picker offers — a pending one has not been agreed to yet, and a
          rejected one never will be. */}
      <WorkOrderModal
        open={workOrder}
        onClose={() => setWorkOrder(false)}
        suggestedReference={suggestWorkOrderReference(workOrders.items)}
        departments={DEPARTMENTS}
        requisitions={rows.filter(r => r.stage === "approved" || r.stage === "ordered")}
        onSubmit={async values => {
          const created = await workOrders.create(values as never);
          if (!created) return false; // useResourceCrud has surfaced the error
          push({ title: t("workOrderCreated", { reference: values.reference }), tone: "info" });
          // An order commits the hospital to money, so finance hears about it
          // whether or not they were the desk that raised it.
          void notify({
            kind: "work_order.created",
            title: t("workOrderIssued", { reference: values.reference }),
            body: values.bill_to_name ? t("workOrderTo", { name: values.bill_to_name }) : undefined,
            tone: "info",
            entity_type: "work_orders",
            entity_id: created.id,
          });
          return true;
        }}
      />

      <Modal open={!!view} onClose={() => setView(null)} title={view?.reference ?? ""}>
        {view && (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">{t("view_.item")}</span> <b>{view.title}</b></p>
            <p><span className="text-muted-foreground">{t("view_.department")}</span> {view.department || "—"}</p>
            <p><span className="text-muted-foreground">{t("view_.vendor")}</span> {view.vendors?.name ?? view.vendor_name ?? "—"}</p>
            <p><span className="text-muted-foreground">{t("view_.amount")}</span> {fmt(view.amount)}</p>
            <p><span className="text-muted-foreground">{t("view_.stage")}</span> <Pill>{stageLabel(view.stage)}</Pill></p>
            {view.notes && <p><span className="text-muted-foreground">{t("view_.notes")}</span> {view.notes}</p>}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};
export default Procurement;
