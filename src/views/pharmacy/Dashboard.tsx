"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowDown, ArrowUp, Banknote, Boxes, CalendarClock, CalendarX, ClipboardList, PackageX,
  Receipt, ShoppingBasket, ShoppingCart, TrendingUp, Users, Wallet,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { usePharmacyCan } from "@/components/pharmacy/ui";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { StateBlock, Tile } from "@/components/pharmacy/ui";
import { Btn, Card, Pill, SectionTitle } from "@/components/admin/ui";
import { useFormatters } from "@/lib/appSettings";
import type { PharmacyDashboard } from "@/lib/pharmacy";
import { usePharmacyDashboardQuery } from "@/redux/api/pharmacy";

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))", "hsl(var(--chip))", "hsl(var(--muted-foreground))"];
const TOOLTIP = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };

/** "up 12%" or "down 40%" against an earlier figure; nothing when there is no earlier figure to compare with. */
const Change = ({ now, before, label }: { now: number; before: number; label: string }) => {
  if (before <= 0) return <span>{label}</span>;
  const percent = ((now - before) / before) * 100;
  const up = percent >= 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center font-semibold ${up ? "text-emerald-700" : "text-destructive"}`}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(percent).toFixed(0)}%
      </span>
      {label}
    </span>
  );
};

const WATCH_TONE = { out_of_stock: "bad", low_stock: "warn", expired: "bad", expiring_soon: "warn" } as const;

const Body = ({ d }: { d: PharmacyDashboard }) => {
  const t = useTranslations("pharmacy.dashboard");
  const tm = useTranslations("pharmacy.methods");
  const ta = useTranslations("pharmacy.alerts.kinds");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const money = (value: number) => formatCurrency(Number(value));
  // Takings, profit and the month's totals are a report (0131). The till still sees stock and its own recent sales.
  const sees = usePharmacyCan()("see_reports");
  const net =Number(d.month.revenue) - Number(d.month.expenses);
  const trend = d.trend.map(point => ({ ...point, revenue: Number(point.revenue), label: formatDate(point.day, "DD MMM") }));
  const hours = d.hourly.map(point => ({ hour: `${point.hour}:00`, revenue: Number(point.revenue) }));
  const mix = d.payment_mix.map(row => ({ name: tm(row.method), value: Number(row.revenue), count: row.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pharmacy/cash-drawer" className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${d.drawer ? "bg-accent/50 text-accent-foreground" : "bg-yellow-100 text-yellow-900"}`}>
          <Wallet className="h-4 w-4" />
          {d.drawer ? t("drawerOpen", { amount: money(d.drawer.balance) }) : t("drawerClosed")}
        </Link>
        <Link href="/pharmacy/pos"><Btn><ShoppingCart className="h-4 w-4" /> {t("openPos")}</Btn></Link>
      </div>

      {sees && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon={Banknote} label={t("today")} value={money(d.today.revenue)}
          hint={<Change now={Number(d.today.revenue)} before={Number(d.yesterday.revenue)} label={t("vsYesterday")} />} />
        <Tile icon={ShoppingCart} label={t("invoices")} value={d.today.transactions} hint={t("unitsSold", { count: d.today.units })} />
        <Tile icon={TrendingUp} label={t("grossProfit")} value={money(d.today.gross_profit)} hint={t("margin", { percent: d.today.margin })}
          tone={Number(d.today.gross_profit) < 0 ? "bad" : "default"} />
        <Tile icon={ShoppingBasket} label={t("avgBasket")} value={money(d.today.avg_basket)} hint={t("customersToday", { count: d.today.customers })} />
      </div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/pharmacy/stock-alerts"><Tile icon={PackageX} label={t("outOfStock")} value={d.alerts.out_of_stock} tone={d.alerts.out_of_stock ? "bad" : "default"} className="hover:border-primary/40 transition" /></Link>
        <Link href="/pharmacy/stock-alerts"><Tile icon={AlertTriangle} label={t("lowStock")} value={d.alerts.low_stock} tone={d.alerts.low_stock ? "warn" : "default"} className="hover:border-primary/40 transition" /></Link>
        <Link href="/pharmacy/stock?state=expiring_soon"><Tile icon={CalendarClock} label={t("expiring", { days: d.alerts.expiring_soon_days })} value={d.alerts.expiring} tone={d.alerts.expiring ? "warn" : "default"} className="hover:border-primary/40 transition" /></Link>
        <Link href="/pharmacy/stock?state=expired"><Tile icon={CalendarX} label={t("expired")} value={d.alerts.expired} tone={d.alerts.expired ? "bad" : "default"} className="hover:border-primary/40 transition" /></Link>
      </div>

      {sees && <>
      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle title={t("trendTitle")} action={<Link href="/pharmacy/reports" className="text-sm font-semibold text-primary hover:underline">{t("viewAll")}</Link>} />
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="pharmacyTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} width={56} />
                <Tooltip contentStyle={TOOLTIP} formatter={(value: number) => [money(value), t("revenue")]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#pharmacyTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("paymentMix")} />
          {mix.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t("noSalesToday")}</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="100%" paddingAngle={2}>
                      {mix.map((row, index) => <Cell key={row.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(value: number) => money(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-1.5">
                {mix.map((row, index) => (
                  <li key={row.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{row.name}</span>
                    <span className="tabular-nums font-semibold">{money(row.value)} <span className="text-muted-foreground font-normal">({row.count})</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div>
        <SectionTitle title={t("monthTitle")} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile label={t("salesTitle")} value={money(d.month.revenue)}
            hint={<Change now={Number(d.month.revenue)} before={Number(d.month.last_month_revenue)} label={t("vsLastMonth")} />} />
          <Tile icon={Receipt} label={t("expensesMonth")} value={money(d.month.expenses)} />
          <Tile label={t("netMonth")} value={money(net)} hint={t("netHint")} tone={net < 0 ? "bad" : "good"} />
          <Tile label={t("taxMonth")} value={money(d.month.tax)} />
          <Tile label={t("last7")} value={money(d.week.revenue)} />
          <Tile label={t("yearToDate")} value={money(d.year.revenue)} />
          <Tile icon={Boxes} label={t("inventoryValue")} value={money(d.inventory.value_retail)} hint={t("atCost", { amount: money(d.inventory.value_cost) })} />
          <Link href="/pharmacy/purchases"><Tile icon={ClipboardList} label={t("openOrders")} value={d.purchase_orders.open} className="hover:border-primary/40 transition" /></Link>
          <Link href="/pharmacy/customers"><Tile icon={Users} label={t("customers")} value={d.customers.total} hint={t("newThisMonth", { count: d.customers.new_this_month })} className="hover:border-primary/40 transition" /></Link>
          <Link href="/pharmacy/customers"><Tile label={t("balanceDue")} value={money(d.customers.balance_due)} hint={t("withBalance", { count: d.customers.with_balance })}
            tone={Number(d.customers.balance_due) > 0 ? "warn" : "default"} className="hover:border-primary/40 transition" /></Link>
          <Tile label={t("creditToday")} value={money(d.today.credit_amount)} hint={t("creditCount", { count: d.today.credit_count })} />
          <Tile label={t("yesterday")} value={money(d.yesterday.revenue)} />
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle title={t("hourly")} />
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={hours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={1} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} width={56} />
              <Tooltip contentStyle={TOOLTIP} formatter={(value: number) => [money(value), t("revenue")]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      </>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <SectionTitle title={t("topSellers")} />
          {d.top_sellers.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t("noTopSellers")}</p> : (
            <ol className="space-y-2">
              {d.top_sellers.map((row, index) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="h-6 w-6 rounded-full bg-muted grid place-items-center text-[11px] font-bold shrink-0">{index + 1}</span>
                    <span className="font-semibold text-primary truncate">{row.name}</span>
                  </span>
                  <span className="tabular-nums whitespace-nowrap"><span className="text-muted-foreground">{row.quantity} × </span>{money(row.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("recentSales")} action={<Link href="/pharmacy/sales" className="text-sm font-semibold text-primary hover:underline">{t("viewAll")}</Link>} />
          {d.recent_sales.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t("noRecent")}</p> : (
            <ul className="space-y-2">
              {d.recent_sales.map(sale => (
                <li key={sale.id} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-mono text-xs font-semibold text-primary">{sale.invoice_number}</span>
                    <span className="tabular-nums font-semibold">{money(sale.total_amount)}</span>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-1 mt-1">{sale.items}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sale.cashier ?? "—"} · {formatDateTime(sale.sold_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("stockWatch")} action={<Link href="/pharmacy/stock-alerts" className="text-sm font-semibold text-primary hover:underline">{t("viewAll")}</Link>} />
          {d.stock_watch.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">{t("allGood")}</p> : (
            <ul className="space-y-2">
              {d.stock_watch.map((row, index) => (
                <li key={`${row.name}-${row.kind}-${index}`} className="rounded-xl bg-muted/40 p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.expiry_date ? t("expires", { date: formatDate(row.expiry_date) }) : t("stockLeft", { count: row.quantity, reorder: row.reorder })}
                    </p>
                  </div>
                  <Pill tone={WATCH_TONE[row.kind]}>{ta(row.kind)}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.dashboard");
  const { data, isLoading, error, refetch } = usePharmacyDashboardQuery();

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      {data?.data ? <Body d={data.data} /> : <StateBlock loading={isLoading} error={error} onRetry={refetch} rows={6} />}
    </PharmacyLayout>
  );
};

export default Page;
