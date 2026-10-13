"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { Pager, SearchBox, StateBlock, useDebounced, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { Chips, Select, exportCSV } from "@/components/admin/crud";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import { shiftDay, type AuditRow } from "@/lib/pharmacy";
import { usePharmacyAuditQuery } from "@/redux/api/pharmacy";

/** The pharmacy tables the log is kept for (0126, 0133), in the order a person would look for them. */
const TABLES = [
  "pharmacy_sales", "pharmacy_sale_returns", "pharmacy_sale_payments", "pharmacy_cash_shifts", "pharmacy_cash_transactions",
  "pharmacy_expenses", "pharmacy_items", "pharmacy_batches", "pharmacy_purchase_orders", "pharmacy_suppliers",
  "pharmacy_customers", "pharmacy_staff", "pharmacy_branches", "pharmacy_registers", "pharmacy_settings",
] as const;
type Table = (typeof TABLES)[number];

const ACTIONS = ["all", "insert", "update", "delete"] as const;
const ACTION_TONE: Record<AuditRow["action"], "ok" | "info" | "bad"> = { insert: "ok", update: "info", delete: "bad" };

const Page = () => {
  const t = useTranslations("pharmacy.audit");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const { formatDateTime } = useFormatters();
  const { today } = useBookingClock();

  const [q, setQ] = useState("");
  const [from, setFrom] = useState(shiftDay(today, -6));
  const [to, setTo] = useState(today);
  const [table, setTable] = useState("");
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  useEffect(() => { setPage(1); }, [search, from, to, table, action]);

  const filters = { from, to, table: table || undefined, action: action === "all" ? undefined : action, q: search || undefined };
  const { data, isLoading, isFetching, error, refetch } = usePharmacyAuditQuery({ ...filters, page, limit: 25 });
  const rows = data?.data ?? [];

  const tableName = (name: string) => ((TABLES as readonly string[]).includes(name) ? t(`tables.${name as Table}`) : name);
  // No name and no email means nobody was signed in: a change made by the system itself.
  const who = (row: AuditRow) => row.actor_name ?? row.actor_email ?? t("system");

  // Everything that matches, not only this page: read two hundred at a time.
  const download = async () => {
    try {
      const all: AuditRow[] = [];
      for (let next = 1; next <= 25; next += 1) {
        const params = new URLSearchParams({ page: String(next), limit: "200" });
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        const response = await fetch(`/api/v1/pharmacy/audit?${params}`);
        const body = await response.json();
        if (!response.ok) throw { data: body };
        all.push(...(body.data as AuditRow[]));
        if (next >= body.meta.totalPages) break;
      }
      exportCSV(all.map(row => ({
        when: row.occurred_at, who: who(row), email: row.actor_email ?? "", what: tableName(row.table_name),
        action: row.action, record: row.label ?? "", changed: row.changed_fields.join(" "),
      })), `pharmacy-audit-${from}-${to}.csv`);
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="administer">
      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <SearchBox value={q} onChange={setQ} placeholder={t("searchPlaceholder")} className="flex-1" />
          <Select value={table} onChange={e => setTable(e.target.value)} className="!w-auto" aria-label={t("columns.what")}>
            <option value="">{t("allTables")}</option>
            {TABLES.map(name => <option key={name} value={name}>{t(`tables.${name}`)}</option>)}
          </Select>
          <Btn variant="outline" onClick={download} disabled={rows.length === 0}><Download className="h-4 w-4" /> {tc("exportCsv")}</Btn>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <DateInput value={from} onChange={setFrom} max={to || today} aria-label={tc("from")} wrapperClassName="w-40" showClear={false} />
          <DateInput value={to} onChange={setTo} min={from} max={today} aria-label={tc("to")} wrapperClassName="w-40" showClear={false} />
          <Chips value={action} onChange={setAction}
            options={ACTIONS.map(value => ({ value, label: value === "all" ? t("allActions") : t(`actions.${value}`) }))} />
        </div>

        {isLoading || error || rows.length === 0 ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("none")} rows={6} />
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""} transition-opacity`}>
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">{t("columns.when").toUpperCase()}</th>
                  <th className="py-2 px-3">{t("columns.who").toUpperCase()}</th>
                  <th className="py-2 px-3">{t("columns.action").toUpperCase()}</th>
                  <th className="py-2 px-3">{t("columns.what").toUpperCase()}</th>
                  <th className="py-2 px-3">{t("columns.record").toUpperCase()}</th>
                  <th className="py-2 pl-3">{t("columns.changed").toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-border/40 align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-xs">{formatDateTime(row.occurred_at)}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-primary">{who(row)}</p>
                      {row.actor_name && row.actor_email && <p className="text-[11px] text-muted-foreground">{row.actor_email}</p>}
                    </td>
                    <td className="py-2.5 px-3"><Pill tone={ACTION_TONE[row.action]}>{t(`actions.${row.action}`)}</Pill></td>
                    <td className="py-2.5 px-3">{tableName(row.table_name)}</td>
                    <td className="py-2.5 px-3">
                      {row.label ?? <span className="text-muted-foreground">{row.action === "delete" || !row.record_id ? "—" : t("deletedRecord")}</span>}
                    </td>
                    <td className="py-2.5 pl-3 text-xs text-muted-foreground">{row.changed_fields.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.meta && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
        <p className="text-[11px] text-muted-foreground mt-4">{t("hint")}</p>
      </Card>
    </PharmacyLayout>
  );
};

export default Page;
