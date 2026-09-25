"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import { DataTable, Toolbar, Modal, Field, Input, Select, Chips, statusTone, RowActions, ConfirmDialog, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { ResourcePage } from "@/components/admin/ResourcePage";
import type { LabTestRow } from "@/redux/api/resources";
import type { Tables } from "@/lib/supabase/types";

/** Stored lowercase to match doctors, nurses and support staff. */
const CATALOG_STATUSES = ["active", "inactive"] as const;

/**
 * An order, with the patient and doctor names the resource embeds (0047).
 * Column names are the database's, so form values post straight through.
 */
type LabOrder = Tables<"lab_orders"> & {
  patients?: { full_name: string } | null;
  doctors?: { name: string } | null;
};

type PatientOption = { id: string; full_name: string };
type DoctorOption = { id: string; name: string };

/**
 * Statuses are stored lowercase across every module, so this map is the only
 * place they get capitalised — the pill, the chips and the toast.
 */
const ORDER_FLOW = ["pending", "sample_collected", "processing", "reported"] as const;
type OrderStatus = (typeof ORDER_FLOW)[number];

/** Month names in the reader's language; digits stay Western (see appSettings). */
const stamp = (iso: string | null, locale: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** "L-1042", numbered within the hospital. The unique index catches a genuine clash. */
const suggestReference = (orders: LabOrder[]) => {
  const used = orders
    .map(o => Number(o.reference.trim().toUpperCase().replace(/^L-/, "")))
    .filter(Number.isFinite);
  return `L-${used.length ? Math.max(...used) + 1 : 1001}`;
};

const Lab = () => {
  const t = useTranslations("admin.lab");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();
  const locale = useLocale();

  const orderStatusLabel = (value: string) =>
    (ORDER_FLOW as readonly string[]).includes(value) ? t(`orderStatuses.${value as OrderStatus}`) : value;
  const catalogStatusLabel = (value: string) =>
    (CATALOG_STATUSES as readonly string[]).includes(value)
      ? t(`catalogStatuses.${value as (typeof CATALOG_STATUSES)[number]}`)
      : value;
  const catalogStatuses = CATALOG_STATUSES.map(value => ({ value, label: catalogStatusLabel(value) }));

  const crud = useResourceCrud<LabOrder>("lab-orders");
  // Ordering needs three real lists: who it is for, what was ordered, and who
  // asked for it.
  const patients = useResourceCrud<PatientOption>("patients");
  const catalogue = useResourceCrud<LabTestRow>("lab-tests");
  const doctors = useResourceCrud<DoctorOption>("doctors");

  const { push } = useNotifications();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [add, setAdd] = useState(false);
  const [result, setResult] = useState<LabOrder | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);

  const orders = crud.items;

  const rows = orders.filter(o => {
    if (status !== "all" && o.status !== status) return false;
    if (!q) return true;
    const term = q.toLowerCase();
    return [o.reference, o.test_name, o.patients?.full_name, o.doctors?.name]
      .some(v => (v ?? "").toLowerCase().includes(term));
  });

  const activeTests = useMemo(
    () => catalogue.items.filter(t => t.status === "active"),
    [catalogue.items],
  );

  /**
   * Walk the order along. The last step is not an advance but a result, so it
   * opens the result form instead — an order becomes "reported" by having a
   * result, not by a button press.
   */
  const advance = async (order: LabOrder) => {
    const i = ORDER_FLOW.indexOf(order.status as OrderStatus);
    if (i < 0 || i >= ORDER_FLOW.length - 2) { setResult(order); return; }
    const next = ORDER_FLOW[i + 1];
    await crud.update(order.id, { status: next } as never);
    push({ title: `${order.reference} → ${orderStatusLabel(next)}`, tone: "info" });
    // The arrow is punctuation, not a word: it reads the same in both languages.
  };

  const cols: Column<LabOrder>[] = [
    { key: "reference", label: t("columns.request"), sortable: true, accessor: r => r.reference,
      render: r => <span className="font-mono text-xs font-semibold text-primary">{r.reference}</span> },
    { key: "patient", label: t("columns.patient"), sortable: true, accessor: r => r.patients?.full_name ?? "",
      render: r => <span>{r.patients?.full_name ?? "—"}</span> },
    { key: "test_name", label: t("columns.test"), accessor: r => r.test_name },
    { key: "doctor", label: t("columns.doctor"), accessor: r => r.doctors?.name ?? "",
      render: r => <span>{r.doctors?.name ?? <span className="text-muted-foreground">{t("walkIn")}</span>}</span> },
    { key: "requested_at", label: t("columns.requested"), sortable: true, accessor: r => r.requested_at,
      render: r => stamp(r.requested_at, locale) },
    { key: "status", label: t("columns.status"),
      render: r => <Pill tone={statusTone(r.status)}>{orderStatusLabel(r.status)}</Pill> },
  ];

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setAdd(true)} addLabel={t("addRequest")}
          onExport={() => exportCSV(rows as never, "lab-orders.csv")}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={<Chips value={status as never} onChange={setStatus as never}
            options={[{ value: "all", label: t("all") }, ...ORDER_FLOW.map(s => ({ value: s, label: orderStatusLabel(s) }))]} />}
        />

        {crud.error ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">{t("loadFailed")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("loadFailedHint")}</p>
            <button type="button" onClick={() => crud.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">
              {t("tryAgain")}
            </button>
          </div>
        ) : crud.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        ) : (
          <DataTable<LabOrder>
            rows={rows}
            columns={cols}
            selected={sel}
            onSelect={setSel}
            empty={t("empty")}
            actions={r => <RowActions
              onDelete={() => setDel(r.id)}
              // Moving an order to its next step asks first. Entering or
              // updating a result opens its own form, so that goes straight.
              extra={<Btn variant="ghost" onClick={async () => {
                const opensForm = r.status === "processing" || r.status === "reported";
                if (opensForm || await confirmAction(t("advance"), { name: r.reference })) void advance(r);
              }}>
                {r.status === "reported" ? t("updateResult") : r.status === "processing" ? t("enterResult") : t("advance")}
              </Btn>}
            />}
          />
        )}
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title={t("newRequest")}
        footer={<><Btn variant="outline" onClick={() => setAdd(false)}>{tc("cancel")}</Btn>
          <button form="lab-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("submit")}</button></>}>
        <form id="lab-form" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const testId = String(fd.get("lab_test_id") || "");
          const test = activeTests.find(t => t.id === testId);
          if (!test) { push({ title: t("pickTest"), tone: "warn" }); return; }

          const created = await crud.create({
            reference: String(fd.get("reference") || "").trim(),
            patient_id: String(fd.get("patient_id")),
            lab_test_id: test.id,
            // Snapshot the name as displayed, so the order still reads correctly
            // if the catalogue entry is renamed or retired later.
            test_name: test.name,
            doctor_id: String(fd.get("doctor_id") || "") || null,
          } as never);
          if (!created) return; // useResourceCrud has surfaced the error
          push({ title: t("newRequestToast", { test: test.name }), tone: "info" });
          setAdd(false);
        }}>
          <Field label={t("fields.reference")} required>
            <Input name="reference" required defaultValue={suggestReference(orders)} />
          </Field>
          <Field label={t("fields.patient")} required>
            <Select name="patient_id" required>
              <option value="">{t("selectPatient")}</option>
              {patients.items.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.test")} required>
            <Select name="lab_test_id" required>
              <option value="">{t("selectTest")}</option>
              {activeTests.map(test => <option key={test.id} value={test.id}>{test.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fields.requestingDoctor")}>
            <Select name="doctor_id">
              <option value="">{t("noRequestingDoctor")}</option>
              {doctors.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          {activeTests.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">{t("catalogueEmpty")}</p>
          )}
        </form>
      </Modal>

      <Modal open={!!result} onClose={() => setResult(null)} title={t("resultFor", { reference: result?.reference ?? "" })}
        footer={<><Btn variant="outline" onClick={() => setResult(null)}>{tc("cancel")}</Btn>
          <button form="result-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">{tc("save")}</button></>}>
        <form id="result-form" onSubmit={async e => {
          e.preventDefault();
          if (!result) return;
          const fd = new FormData(e.currentTarget);
          const text = String(fd.get("result") || "").trim();
          if (!text) { push({ title: t("enterResultFirst"), tone: "warn" }); return; }
          // Result, timestamp and status move together — the table has a check
          // constraint tying the first two, and a reported order without a
          // result would be a lie.
          await crud.update(result.id, {
            result: text,
            reported_at: new Date().toISOString(),
            status: "reported",
          } as never);
          push({ title: t("resultPublished", { reference: result.reference }), tone: "ok" });
          setResult(null);
        }}>
          <Field label={t("fields.result")}>
            <textarea name="result" rows={4} defaultValue={result?.result ?? ""}
              className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)}
        onConfirm={() => { if (del) void crud.remove(del); }}
        title={t("deleteRequest")}
        description={t("deleteRequestBody")} />
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)}
        onConfirm={() => { void crud.bulkRemove(sel); setSel([]); }}
        title={t("deleteMany", { count: sel.length })} />

      <div className="mt-8">
        <SectionTitle title={t("catalogueTitle")} />
        <ResourcePage<LabTestRow> config={{
          storeKey: "lab-catalog",
          resource: "lab-tests",
          searchFields: ["name", "category", "sample"],
          statuses: catalogStatuses,
          exportName: "lab-catalog",
          columns: [
            { key: "name", label: t("columns.test"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
            { key: "category", label: t("columns.category"), sortable: true, accessor: r => r.category ?? "", render: r => <span>{r.category || "—"}</span> },
            // numeric(10,2) arrives as a string from PostgREST, so sorting has
            // to coerce or "9" sorts after "320".
            { key: "price", label: t("columns.price"), sortable: true, accessor: r => Number(r.price) },
            { key: "turnaround", label: t("columns.turnaround"), render: r => <span>{r.turnaround || "—"}</span> },
            { key: "sample", label: t("columns.sample"), render: r => <span>{r.sample || "—"}</span> },
            { key: "status", label: t("columns.status"), render: r => <Pill tone={statusTone(r.status)}>{catalogStatusLabel(r.status)}</Pill> },
          ],
          fields: [
            { name: "name", label: t("fields.testName"), type: "text", required: true },
            { name: "price", label: t("fields.price"), type: "number", required: true, min: 0, numberStep: 0.01 },
            { name: "turnaround", label: t("fields.turnaround"), type: "text" },
            { name: "sample", label: t("fields.sample"), type: "text" },
            { name: "status", label: t("fields.status"), type: "select", options: catalogStatuses },
            { name: "description", label: t("fields.description"), type: "textarea" },
          ],
        }} />
      </div>
    </AdminLayout>
  );
};
export default Lab;
