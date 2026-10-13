"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, Tile } from "@/components/pharmacy/ui";
import { Btn, Card, SectionTitle } from "@/components/admin/ui";
import { exportCSV } from "@/components/admin/crud";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import { monthStartOf, shiftDay, type PharmacyReport } from "@/lib/pharmacy";
import { usePharmacyReportQuery } from "@/redux/api/pharmacy";

const TOOLTIP = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };
const RANGES = ["d7", "d30", "d90", "month"] as const;

/** A two-or-more column table of names and figures. The last column is the bar the row is measured by. */
const Ranked = ({ heads, rows }: { heads: string[]; rows: { key: string; cells: (string | number)[]; share: number }[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
        <tr>{heads.map((head, index) => <th key={head} className={`py-2 font-bold ${index === 0 ? "" : "text-right"}`}>{head.toUpperCase()}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.key} className="border-t border-border/40">
            {row.cells.map((cell, index) => (
              <td key={index} className={`py-2 ${index === 0 ? "font-semibold text-primary" : "text-right tabular-nums"}`}>
                {index === 0 ? (
                  <div>
                    <span>{cell}</span>
                    <div className="h-1 rounded-full bg-muted mt-1"><div className="h-1 rounded-full bg-primary" style={{ width: `${Math.max(Math.min(row.share, 100), 2)}%` }} /></div>
                  </div>
                ) : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Body = ({ r }: { r: PharmacyReport }) => {
  const t = useTranslations("pharmacy.reports");
  const tm = useTranslations("pharmacy.methods");
  const { formatCurrency, formatDate } = useFormatters();
  const money = (value: number) => formatCurrency(Number(value));
  const s = r.summary;
  const daily = r.daily.map(point => ({ label: formatDate(point.day, "DD MMM"), revenue: Number(point.revenue), transactions: point.transactions }));
  const share = (value: number, of: number) => (of > 0 ? (Number(value) / of) * 100 : 0);
  const topRevenue = Math.max(...r.top_products.map(row => Number(row.revenue)), 0);
  const topCategory = Math.max(...r.by_category.map(row => Number(row.revenue)), 0);
  const topSpend = Math.max(...r.expenses_by_category.map(row => Number(row.amount)), 0);

  if (s.transactions === 0 && Number(s.expenses) === 0) {
    return (
      <>
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("noData")}</Card>
        <Inventory r={r} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label={t("cards.revenue")} value={money(s.revenue)} />
        <Tile label={t("cards.grossProfit")} value={money(s.gross_profit)} hint={t("cards.margin", { percent: s.margin })} tone={Number(s.gross_profit) < 0 ? "bad" : "good"} />
        <Tile label={t("cards.expenses")} value={money(s.expenses)} />
        <Tile label={t("cards.net")} value={money(s.net)} hint={t("cards.netHint")} tone={Number(s.net) < 0 ? "bad" : "good"} />
        <Tile label={t("cards.transactions")} value={s.transactions} />
        <Tile label={t("cards.units")} value={s.units} />
        <Tile label={t("cards.avgTicket")} value={money(s.avg_ticket)} />
        <Tile label={t("cards.refunds")} value={money(s.refunds)} hint={t("cards.refundCount", { count: s.returned_count })} tone={Number(s.refunds) > 0 ? "warn" : "default"} />
        <Tile label={t("cards.tax")} value={money(s.tax)} />
        <Tile label={t("cards.discount")} value={money(s.discount)} />
        <Tile label={t("cards.creditSales")} value={money(s.credit_sales)} />
        <Tile label={t("cards.prescriptionSales")} value={money(s.prescription_sales)} />
        <Tile label={t("cards.customerSales")} value={money(s.customer_sales)} />
        <Tile label={t("cards.walkInSales")} value={money(s.walk_in_sales)} />
        <Tile label={t("cards.purchases")} value={money(s.purchases)} />
      </div>

      <Card className="p-5">
        <SectionTitle title={t("daily")} />
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} width={56} />
              <Tooltip contentStyle={TOOLTIP} formatter={(value: number) => [money(value), t("cards.revenue")]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title={t("topProducts")} />
          <Ranked heads={[t("heads.product"), t("heads.qty"), t("heads.revenue"), t("heads.profit")]}
            rows={r.top_products.map(row => ({ key: row.name, share: share(row.revenue, topRevenue), cells: [row.name, row.quantity, money(row.revenue), money(row.profit)] }))} />
        </Card>
        <Card className="p-5">
          <SectionTitle title={t("byCategory")} />
          <Ranked heads={[t("heads.category"), t("heads.qty"), t("heads.revenue")]}
            rows={r.by_category.map(row => ({ key: row.category, share: share(row.revenue, topCategory), cells: [row.category, row.quantity, money(row.revenue)] }))} />
        </Card>
        <Card className="p-5">
          <SectionTitle title={t("paymentMix")} />
          <Ranked heads={[t("heads.method"), t("heads.count"), t("heads.revenue"), t("heads.avg")]}
            rows={r.payment_mix.map(row => ({ key: row.method, share: share(row.revenue, Number(s.revenue)), cells: [tm(row.method), row.count, money(row.revenue), money(row.avg)] }))} />
        </Card>
        <Card className="p-5">
          <SectionTitle title={t("cashiers")} />
          <Ranked heads={[t("heads.cashier"), t("heads.count"), t("heads.revenue")]}
            rows={r.cashiers.map(row => ({ key: row.name, share: share(row.revenue, Number(s.revenue)), cells: [row.name, row.count, money(row.revenue)] }))} />
        </Card>
        {r.expenses_by_category.length > 0 && (
          <Card className="p-5">
            <SectionTitle title={t("expensesByCategory")} />
            <Ranked heads={[t("heads.category"), t("heads.amount")]}
              rows={r.expenses_by_category.map(row => ({ key: row.category, share: share(row.amount, topSpend), cells: [row.category, money(row.amount)] }))} />
          </Card>
        )}
      </div>

      <Inventory r={r} />
    </div>
  );
};

/** What is on the shelf now. Not for the period: stock has no history to report a span of. */
const Inventory = ({ r }: { r: PharmacyReport }) => {
  const t = useTranslations("pharmacy.reports");
  const { formatCurrency } = useFormatters();
  const inv = r.inventory;
  return (
    <div className="mt-6">
      <SectionTitle title={t("inventory")} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label={t("inv.products")} value={inv.products} />
        <Tile label={t("inv.units")} value={inv.units} />
        <Tile label={t("inv.valueRetail")} value={formatCurrency(Number(inv.value_retail))} />
        <Tile label={t("inv.valueCost")} value={formatCurrency(Number(inv.value_cost))} />
        <Tile label={t("inv.outOfStock")} value={inv.out_of_stock} tone={inv.out_of_stock ? "bad" : "default"} />
        <Tile label={t("inv.lowStock")} value={inv.low_stock} tone={inv.low_stock ? "warn" : "default"} />
        <Tile label={t("inv.expiring")} value={inv.expiring} tone={inv.expiring ? "warn" : "default"} />
        <Tile label={t("inv.expired")} value={inv.expired} tone={inv.expired ? "bad" : "default"} />
      </div>
    </div>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.reports");
  const tc = useTranslations("pharmacy.common");
  const { today } = useBookingClock();
  const [from, setFrom] = useState(shiftDay(today, -29));
  const [to, setTo] = useState(today);
  const { data, isLoading, isFetching, error, refetch } = usePharmacyReportQuery({ from, to }, { skip: !from || !to });
  const report = data?.data;

  const pick = (range: (typeof RANGES)[number]) => {
    setTo(today);
    setFrom(range === "month" ? monthStartOf(today) : shiftDay(today, range === "d7" ? -6 : range === "d30" ? -29 : -89));
  };

  const download = () => {
    if (!report) return;
    exportCSV(report.daily.map(row => ({ day: row.day, sales: row.revenue, invoices: row.transactions })), `pharmacy-report-${from}-${to}.csv`);
  };

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="see_reports">
      <Card className="p-4 mb-6 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1">
            {RANGES.map(range => (
              <button key={range} type="button" onClick={() => pick(range)}
                className="px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-card transition">
                {t(`ranges.${range}`)}
              </button>
            ))}
          </div>
          <DateInput value={from} onChange={setFrom} max={to || today} aria-label={tc("from")} wrapperClassName="w-40" showClear={false} />
          <DateInput value={to} onChange={setTo} min={from} max={today} aria-label={tc("to")} wrapperClassName="w-40" showClear={false} />
          <div className="ml-auto flex gap-2">
            <Btn variant="outline" onClick={download} disabled={!report}><Download className="h-4 w-4" /> {tc("exportCsv")}</Btn>
            <Btn variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> {tc("print")}</Btn>
          </div>
        </div>
      </Card>

      {report ? (
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}><Body r={report} /></div>
      ) : (
        <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={6} />
      )}
    </PharmacyLayout>
  );
};

export default Page;
