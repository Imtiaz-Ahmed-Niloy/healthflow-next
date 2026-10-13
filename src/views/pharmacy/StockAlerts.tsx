"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarX, CheckCircle2, PackageX } from "lucide-react";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { Pager, PerPage, SearchBox, StateBlock, Tile } from "@/components/pharmacy/ui";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { Chips, DataTable, type Column } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useStockAlertsQuery } from "@/redux/api/pharmacy";

const KINDS = ["all", "out_of_stock", "low_stock", "expiring_soon", "expired"] as const;
type Kind = Exclude<(typeof KINDS)[number], "all">;

const KIND_TONE: Record<Kind, "bad" | "warn"> = { out_of_stock: "bad", low_stock: "warn", expiring_soon: "warn", expired: "bad" };

/** One row of either list — a product short of stock, or a batch near or past its date. */
type AlertRow = {
  id: string; kind: Kind; name: string; generic_name: string | null; sku: string; quantity: number;
  reorder: number | null; batch_number: string | null; expiry_date: string | null; location: string | null;
};

const Page = () => {
  const t = useTranslations("pharmacy.alerts");
  const { formatDate } = useFormatters();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const { data, isLoading, error, refetch } = useStockAlertsQuery();

  const rows = useMemo<AlertRow[]>(() => {
    const alerts = data?.data;
    if (!alerts) return [];
    return [
      ...alerts.stock.map(row => ({
        id: `item-${row.id}`, kind: row.kind, name: row.name, generic_name: row.generic_name, sku: row.sku,
        quantity: row.quantity, reorder: row.reorder, batch_number: null, expiry_date: null, location: null,
      })),
      ...alerts.batches.map(row => ({
        id: `batch-${row.id}`, kind: row.kind, name: row.name, generic_name: row.generic_name, sku: row.sku,
        quantity: row.quantity, reorder: null, batch_number: row.batch_number, expiry_date: row.expiry_date, location: row.location,
      })),
    ];
  }, [data]);

  const count = (wanted: Kind) => rows.filter(row => row.kind === wanted).length;
  const needle = q.trim().toLowerCase();
  const matching = rows.filter(row =>
    (kind === "all" || row.kind === kind)
    && (!needle || [row.name, row.generic_name, row.sku, row.batch_number, row.location].some(value => value?.toLowerCase().includes(needle))));
  const totalPages = Math.max(Math.ceil(matching.length / perPage), 1);
  const current = Math.min(page, totalPages);
  // The alerts arrive whole, so the page is cut here. Sorting by a column header sorts what is on the page.
  const shown = matching.slice((current - 1) * perPage, current * perPage);

  const columns: Column<AlertRow>[] = [
    { key: "product", label: t("columns.product"), accessor: r => r.name.toLowerCase(), sortable: true, render: r => (
      <div className="min-w-0">
        <p className="font-semibold text-primary truncate">{r.name}</p>
        {r.generic_name && <p className="text-xs text-muted-foreground truncate">{r.generic_name}</p>}
      </div>
    ) },
    { key: "sku", label: t("columns.sku"), render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "quantity", label: t("columns.quantity"), accessor: r => r.quantity, sortable: true, render: r => <span className="tabular-nums font-semibold">{r.quantity}</span> },
    { key: "reorder", label: t("columns.reorder"), render: r => r.reorder === null ? "—" : <span className="tabular-nums">{r.reorder}</span> },
    { key: "batch", label: t("columns.batch"), render: r => r.batch_number ? <span className="font-mono text-xs">{r.batch_number}</span> : "—" },
    { key: "expiry", label: t("columns.expiry"), accessor: r => r.expiry_date ?? "9999", sortable: true, render: r => r.expiry_date ? <span className="whitespace-nowrap">{formatDate(r.expiry_date)}</span> : "—" },
    { key: "shelf", label: t("columns.shelf"), accessor: r => r.location ?? "", sortable: true, render: r => r.location ?? "—" },
    { key: "alert", label: t("columns.alert"), render: r => <Pill tone={KIND_TONE[r.kind]}>{t(`kinds.${r.kind}`)}</Pill> },
  ];

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Tile icon={PackageX} label={t("kinds.out_of_stock")} value={count("out_of_stock")} tone={count("out_of_stock") ? "bad" : "default"} />
        <Tile icon={AlertTriangle} label={t("kinds.low_stock")} value={count("low_stock")} tone={count("low_stock") ? "warn" : "default"} />
        <Tile icon={CalendarClock} label={t("kinds.expiring_soon")} value={count("expiring_soon")} tone={count("expiring_soon") ? "warn" : "default"} />
        <Tile icon={CalendarX} label={t("kinds.expired")} value={count("expired")} tone={count("expired") ? "bad" : "default"} />
      </div>

      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <SearchBox value={q} onChange={value => { setQ(value); setPage(1); }} placeholder={t("searchPlaceholder")} className="flex-1" />
          <Chips value={kind} onChange={value => { setKind(value); setPage(1); }} options={KINDS.map(value => ({ value, label: t(`kinds.${value}`) }))} />
          <PerPage value={perPage} onChange={value => { setPerPage(value); setPage(1); }} />
          <div className="flex flex-wrap gap-2">
            <Link href="/pharmacy/stock"><Btn variant="outline">{t("goToStock")}</Btn></Link>
            <Link href="/pharmacy/purchases"><Btn variant="outline">{t("orderMore")}</Btn></Link>
          </div>
        </div>

        {isLoading || error ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <p className="font-display text-xl text-primary mt-3">{t("allGood")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("allGoodHint")}</p>
          </div>
        ) : (
          <DataTable<AlertRow> rows={shown} columns={columns} empty={t("noMatch")} />
        )}
        {rows.length > 0 && <Pager page={current} totalPages={totalPages} total={matching.length} onPage={setPage} />}

        {data?.data && <p className="text-[11px] text-muted-foreground mt-4">{t("windowHint", { days: data.data.expiring_soon_days })}</p>}
      </Card>
    </PharmacyLayout>
  );
};

export default Page;
