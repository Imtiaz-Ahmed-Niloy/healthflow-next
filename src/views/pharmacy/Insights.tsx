"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { StateBlock } from "@/components/pharmacy/ui";
import { Btn, Card, Pill, SectionTitle } from "@/components/admin/ui";
import { Chips, DataTable, type Column } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import type { ForecastRow, InsightFlag } from "@/lib/pharmacy";
import { usePharmacyInsightsQuery } from "@/redux/api/pharmacy";

const GROUPS = ["all", "critical", "warning", "healthy", "idle"] as const;
type Group = (typeof GROUPS)[number];

const groupOf = (row: ForecastRow): Exclude<Group, "all"> =>
  row.days_to_stockout === null ? "idle" : row.days_to_stockout < 7 ? "critical" : row.days_to_stockout <= 14 ? "warning" : "healthy";

const SEVERITY_TONE = { high: "bad", medium: "warn", low: "info" } as const;

/** The columns of a flag's rows the messages have a heading for, in the order they read best. */
const FLAG_COLUMNS = [
  "name", "cashier", "sku", "batch_number", "expiry_date", "quantity", "sold", "usual", "price", "cost", "margin", "value",
  "expected", "counted", "discrepancy", "closed_at",
] as const;
type FlagColumn = (typeof FLAG_COLUMNS)[number];
const MONEY_COLUMNS: FlagColumn[] = ["value", "price", "cost", "expected", "counted", "discrepancy"];

const Flag = ({ flag }: { flag: InsightFlag }) => {
  const t = useTranslations("pharmacy.insights");
  const { formatCurrency, formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const columns = FLAG_COLUMNS.filter(column => flag.rows.some(row => row[column] !== undefined && row[column] !== null));

  const cell = (column: FlagColumn, value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    if (MONEY_COLUMNS.includes(column)) return formatCurrency(Number(value));
    if (column === "expiry_date" || column === "closed_at") return formatDate(String(value));
    return String(value);
  };

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-primary flex flex-wrap items-center gap-2">
            {t(`flags.${flag.type}.title`, { count: flag.count })}
            <Pill tone={SEVERITY_TONE[flag.severity]}>{t(`severity.${flag.severity}`)}</Pill>
          </p>
          <p className="text-sm text-muted-foreground mt-1">{t(`flags.${flag.type}.hint`, { value: formatCurrency(Number(flag.value ?? 0)) })}</p>
        </div>
        <Btn variant="outline" className="!px-3 !py-1.5" onClick={() => setOpen(value => !value)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {open ? t("hideRows") : t("showRows")}
        </Btn>
      </div>
      {open && (
        <div className="overflow-x-auto mt-3 rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground">
              <tr>{columns.map(column => <th key={column} className="py-2 px-3 font-bold">{t(`heads.${column}`).toUpperCase()}</th>)}</tr>
            </thead>
            <tbody>
              {flag.rows.map((row, index) => (
                <tr key={index} className="border-t border-border/40">
                  {columns.map(column => <td key={column} className="py-2 px-3 tabular-nums">{cell(column, row[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.insights");
  const tn = useTranslations("pharmacyNav.links");
  const { data, isLoading, error, refetch } = usePharmacyInsightsQuery();
  const [group, setGroup] = useState<Group>("all");

  const forecast = useMemo(() => (data?.data.forecast ?? []).map(row => ({ ...row, id: row.item_id })), [data]);
  const shown = group === "all" ? forecast : forecast.filter(row => groupOf(row) === group);
  const flags = data?.data.flags ?? [];

  const columns: Column<ForecastRow & { id: string }>[] = [
    { key: "product", label: t("columns.product"), render: r => (
      <div className="min-w-0">
        <p className="font-semibold text-primary truncate">{r.name}</p>
        <p className="text-xs text-muted-foreground truncate">{[r.generic_name, r.sku].filter(Boolean).join(" · ")}</p>
      </div>
    ) },
    { key: "stock", label: t("columns.stock"), render: r => <span className="tabular-nums font-semibold">{r.stock}</span> },
    { key: "daily", label: t("columns.daily"), render: r => <span className="tabular-nums">{Number(r.daily) > 0 ? r.daily : "—"}</span> },
    { key: "daysLeft", label: t("columns.daysLeft"), render: r => {
      if (r.days_to_stockout === null) return <span className="text-muted-foreground">—</span>;
      const bucket = groupOf(r);
      return <Pill tone={bucket === "critical" ? "bad" : bucket === "warning" ? "warn" : "ok"}>{r.days_to_stockout}</Pill>;
    } },
    { key: "trend", label: t("columns.trend"), render: r => (
      <span className="inline-flex items-center gap-1 text-xs">
        {r.trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-700" /> : r.trend === "down" ? <TrendingDown className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
        {t(`trends.${r.trend}`)}
      </span>
    ) },
    { key: "suggest", label: t("columns.suggest"), render: r => r.suggested > 0 ? <span className="tabular-nums font-semibold text-primary">{r.suggested}</span> : <span className="text-muted-foreground">—</span> },
  ];

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/pharmacy/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="text-primary font-semibold">{t("title")}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {!data?.data ? <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={6} /> : (
        <div className="space-y-6">
          <div>
            <SectionTitle title={t("flagsTitle")} />
            {flags.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <p className="font-display text-xl text-primary mt-3">{t("allClear")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("allClearHint")}</p>
              </Card>
            ) : (
              <ul className="space-y-3">{flags.map(flag => <Flag key={flag.type} flag={flag} />)}</ul>
            )}
          </div>

          <Card className="p-4 lg:p-5">
            <SectionTitle title={t("forecastTitle")} action={<Link href="/pharmacy/purchases" className="text-sm font-semibold text-primary hover:underline">{tn("purchases")}</Link>} />
            <p className="text-sm text-muted-foreground -mt-2 mb-4">{t("forecastHint")}</p>
            <div className="mb-4">
              <Chips value={group} onChange={setGroup} options={GROUPS.map(value => ({
                value, label: `${t(`groups.${value}`)}${value === "all" ? "" : ` (${forecast.filter(row => groupOf(row) === value).length})`}`,
              }))} />
            </div>
            <DataTable rows={shown} columns={columns} empty={t("noForecast")} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Page;
