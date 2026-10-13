"use client";

import { useRef, useState } from "react";
import { ChevronDown, Download, TrendingUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { PagedResource } from "@/components/pharmacy/PagedResource";
import { usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Pill } from "@/components/admin/ui";
import { Chips, Modal, Select, type Column } from "@/components/admin/crud";
import type { FieldDef } from "@/components/admin/ResourcePage";
import { useFormatters } from "@/lib/appSettings";
import { parseCsv, priceOf, unitsOf, type ItemStatus, type PharmacyItem } from "@/lib/pharmacy";
import { useImportPharmacyItemsMutation, usePharmacyInsightsQuery, usePosItemsQuery, type ImportResult } from "@/redux/api/pharmacy";

const STATUS_TONE: Record<ItemStatus, "ok" | "warn" | "bad"> = { active: "ok", low_stock: "warn", out_of_stock: "bad" };
const FILTERS = ["all", "active", "low_stock", "out_of_stock"] as const;

/** The columns an import file may carry. The first two are the ones it must. */
const IMPORT_COLUMNS = [
  "name", "sku", "generic_name", "category", "manufacturer", "selling_price", "cost_price", "reorder", "requires_prescription",
  "strip_size", "strip_price", "box_size", "box_price",
] as const;
const MAX_IMPORT = 1000;

const ImportDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useTranslations("pharmacy.products");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [send, { isLoading }] = useImportPharmacyItemsMutation();

  const reset = () => { setRows([]); setResult(null); if (input.current) input.current.value = ""; };
  const close = () => { reset(); onClose(); };

  const read = async (file: File | undefined) => {
    setResult(null);
    if (!file) return;
    const table = parseCsv(await file.text());
    const header = (table[0] ?? []).map(cell => cell.trim().toLowerCase().replace(/\s+/g, "_"));
    if (table.length < 2) { toast.error(t("badFile")); return reset(); }
    if (!header.includes("name") || !header.includes("sku")) { toast.error(t("missingColumns")); return reset(); }
    if (table.length - 1 > MAX_IMPORT) { toast.error(t("tooManyRows", { max: MAX_IMPORT })); return reset(); }

    setRows(table.slice(1).map(cells =>
      Object.fromEntries(header.flatMap((column, index) =>
        (IMPORT_COLUMNS as readonly string[]).includes(column) ? [[column, (cells[index] ?? "").trim()]] : [])),
    ));
  };

  const template = () => {
    const sample = ["Napa 500mg", "NAPA-500", "Paracetamol", "Pain relief", "Beximco", "1.20", "0.90", "100", "false"];
    const blob = new Blob([`${IMPORT_COLUMNS.join(",")}\n${sample.join(",")}\n`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pharmacy-products-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  };

  const submit = async () => {
    try {
      const answer = await send({ rows }).unwrap();
      setResult(answer.data);
      setRows([]);
      toast.success(t("importDone", { created: answer.data.created, skipped: answer.data.skipped }));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open={open} onClose={close} title={t("importTitle")} size="lg"
      footer={<>
        <Btn variant="outline" onClick={close}>{tc("close")}</Btn>
        <Btn onClick={submit} disabled={!rows.length || isLoading}>{isLoading ? t("importing") : t("importNow")}</Btn>
      </>}>
      <p className="text-sm text-muted-foreground">{t("importHint")}</p>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <Btn variant="outline" onClick={template}><Download className="h-4 w-4" /> {t("downloadTemplate")}</Btn>
        <Btn variant="outline" onClick={() => input.current?.click()}><Upload className="h-4 w-4" /> {t("chooseFile")}</Btn>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={e => read(e.target.files?.[0])} />
        {rows.length > 0 && <span className="text-sm font-semibold text-primary">{t("rowsReady", { count: rows.length })}</span>}
      </div>
      {result && (
        <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm">
          <p className="font-semibold text-primary">{t("importDone", { created: result.created, skipped: result.skipped })}</p>
          {result.invalid.length > 0 && (
            <>
              <p className="text-destructive mt-2">{t("importInvalid", { count: result.invalid.length })}</p>
              <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
                {result.invalid.map(issue => <li key={issue.row}>{t("rowError", { row: issue.row + 1, message: issue.message })}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

/**
 * Products priced under what they cost, and the ones making very little.
 * Closed until asked for: the figures come from the insights function, which
 * reads every product, and most visits to this page are to edit one.
 */
const MarginInsights = () => {
  const t = useTranslations("pharmacy.products");
  const { formatCurrency } = useFormatters();
  const [open, setOpen] = useState(false);
  const { data, isFetching, refetch } = usePharmacyInsightsQuery(undefined, { skip: !open });

  const flags = data?.data.flags ?? [];
  const rows = [
    ...(flags.find(flag => flag.type === "under_cost")?.rows ?? []).map(row => ({ ...row, loss: true })),
    ...(flags.find(flag => flag.type === "thin_margin")?.rows ?? []).map(row => ({ ...row, loss: false })),
  ] as { name: string; sku: string | null; price: number; cost: number; margin: number | null; loss: boolean }[];

  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary"><TrendingUp className="h-4 w-4" /> {t("marginTitle")}</p>
        <div className="flex items-center gap-2">
          {open && <Btn variant="outline" onClick={() => refetch()} disabled={isFetching}>{t("marginRefresh")}</Btn>}
          <Btn variant="outline" onClick={() => setOpen(value => !value)}>
            {open ? t("marginHide") : t("marginAnalyze")} <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </Btn>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/50 px-4 py-3">
          {isFetching && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("marginLoading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("marginAllGood")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map(row => (
                <li key={`${row.sku}-${row.name}`} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <p className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-primary">{row.name}</span>
                    <Pill tone={row.loss ? "bad" : "warn"}>{row.loss ? t("marginLoss") : t("marginThin")}</Pill>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {t("marginLine", { price: formatCurrency(Number(row.price)), cost: formatCurrency(Number(row.cost)) })}
                    {row.margin != null && ` · ${t("margin", { percent: Number(row.margin).toFixed(0) })}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.products");
  const tc = useTranslations("pharmacy.common");
  const tu = useTranslations("pharmacy.units");
  const can = usePharmacyCan();
  const { formatCurrency } = useFormatters();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const [category, setCategory] = useState("");
  const [importing, setImporting] = useState(false);
  // Only the category list is wanted from the till's search here.
  const { data: till } = usePosItemsQuery({ limit: 1 });
  const categories = till?.categories ?? [];

  const yesNo = [{ value: "true", label: tc("yes") }, { value: "false", label: tc("no") }];

  const columns: Column<PharmacyItem>[] = [
    { key: "name", label: t("columns.name"), render: r => (
      <div className="min-w-0">
        <p className="font-semibold text-primary flex items-center gap-2">
          <span className="truncate">{r.name}</span>
          {r.requires_prescription && <Pill tone="info">{t("rx")}</Pill>}
          {!r.is_active && <Pill>{t("offSale")}</Pill>}
        </p>
        {r.generic_name && <p className="text-xs text-muted-foreground truncate">{r.generic_name}</p>}
      </div>
    ) },
    { key: "category", label: t("columns.category"), render: r => r.category ?? "—" },
    { key: "sku", label: t("columns.sku"), render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "price", label: t("columns.price"), render: r => (
      <div className="tabular-nums">
        {formatCurrency(Number(r.selling_price))}
        {unitsOf(r).length > 1 && (
          <p className="text-[11px] text-muted-foreground">
            {unitsOf(r).filter(unit => unit !== "unit").map(unit => `${tu(unit)} ${formatCurrency(priceOf(r, unit))}`).join(" · ")}
          </p>
        )}
      </div>
    ) },
    { key: "cost", label: t("columns.cost"), render: r => {
      const price = Number(r.selling_price), cost = Number(r.cost_price);
      return (
        <div className="tabular-nums">
          {formatCurrency(cost)}
          {price > 0 && cost > 0 && (
            <p className={`text-[11px] ${price < cost ? "text-destructive" : "text-muted-foreground"}`}>
              {t("margin", { percent: (((price - cost) / price) * 100).toFixed(0) })}
            </p>
          )}
        </div>
      );
    } },
    { key: "stock", label: t("columns.stock"), render: r => <span className="tabular-nums font-semibold">{r.stock}</span> },
    { key: "status", label: t("columns.status"), render: r => <Pill tone={STATUS_TONE[r.status]}>{t(`statuses.${r.status}`)}</Pill> },
  ];

  const fields: FieldDef[] = [
    { name: "name", label: t("fields.name"), type: "text", required: true, fullWidth: true },
    { name: "generic_name", label: t("fields.generic_name"), type: "text" },
    { name: "sku", label: t("fields.sku"), type: "text", required: true },
    { name: "category", label: t("fields.category"), type: "text" },
    { name: "manufacturer", label: t("fields.manufacturer"), type: "text" },
    { name: "selling_price", label: t("fields.selling_price"), type: "number", min: 0, numberStep: "any", required: true },
    { name: "cost_price", label: t("fields.cost_price"), type: "number", min: 0, numberStep: "any" },
    { name: "reorder", label: t("fields.reorder"), type: "number", min: 0 },
    // Stock and prices above are for one single unit. These say what else it is sold as.
    { name: "packs", label: t("packs"), type: "heading" },
    { name: "strip_size", label: t("fields.strip_size"), type: "number", min: 2 },
    { name: "strip_price", label: t("fields.strip_price"), type: "number", min: 0, numberStep: "any" },
    { name: "box_size", label: t("fields.box_size"), type: "number", min: 2 },
    { name: "box_price", label: t("fields.box_price"), type: "number", min: 0, numberStep: "any" },
    { name: "selling", label: t("selling"), type: "heading" },
    { name: "requires_prescription", label: t("fields.requires_prescription"), type: "select", options: yesNo },
    { name: "track_expiry", label: t("fields.track_expiry"), type: "select", options: yesNo },
    { name: "is_active", label: t("fields.is_active"), type: "select", options: yesNo },
    { name: "description", label: t("fields.description"), type: "textarea" },
  ];

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      <PagedResource<PharmacyItem>
        resource="pharmacy-items"
        columns={columns}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        addLabel={t("add")}
        newTitle={t("newTitle")}
        editTitle={t("editTitle")}
        empty={t("noProducts")}
        filters={{ status: status === "all" ? undefined : status, category: category || undefined }}
        defaults={{ requires_prescription: false, track_expiry: true, is_active: true, reorder: 10 }}
        formNote={t("stockHint")}
        deleteHint={t("deleteHint")}
        exportName="pharmacy-products"
        canWrite={can("manage_stock")}
        // The forecast behind the margins is stock work as much as it is a report.
        above={(can("manage_stock") || can("see_reports")) && <MarginInsights />}
        sorts={[
          { value: "name:asc", label: t("sorts.name") },
          { value: "selling_price:desc", label: t("sorts.priceHigh") },
          { value: "selling_price:asc", label: t("sorts.priceLow") },
          { value: "stock:asc", label: t("sorts.stockLow") },
          { value: "stock:desc", label: t("sorts.stockHigh") },
          { value: "created_at:desc", label: t("sorts.newest") },
        ]}
        toolbar={<>
          <Chips value={status} onChange={setStatus} options={FILTERS.map(value => ({ value, label: t(`filters.${value}`) }))} />
          {categories.length > 0 && (
            <Select value={category} onChange={e => setCategory(e.target.value)} className="!w-auto" aria-label={t("columns.category")}>
              <option value="">{t("allCategories")}</option>
              {categories.map(name => <option key={name} value={name}>{name}</option>)}
            </Select>
          )}
        </>}
        beside={can("manage_stock") && <Btn variant="outline" onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> {t("import")}</Btn>}
      />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </PharmacyLayout>
  );
};

export default Page;
