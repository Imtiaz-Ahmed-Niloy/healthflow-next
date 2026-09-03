"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, SectionTitle } from "@/components/admin/ui";
import { exportCSV } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { Download, ShieldAlert, FileBarChart } from "lucide-react";

/**
 * Reports, on /api/v1/reports.
 *
 * The page this replaces had four presets with numbers typed into the source
 * ("Jan 184000", "CBC 412") and a builder whose date fields did nothing. Every
 * report here is counted from this hospital's own rows over the range chosen
 * above, and the CSV is the same rows rather than a second version of them.
 */

type Report = {
  title: string;
  note: string;
  columns: string[];
  rows: (string | number)[][];
  totals: Record<string, number>;
};

type ReportsResponse = {
  range: { from: string; to: string };
  reports: Record<string, Report>;
};

/** Columns whose values are money rather than counts or labels. */
const MONEY_COLUMNS = new Set([
  "Billed", "Collected", "Paid", "Outstanding", "Gross", "Net", "Amount",
]);

const ReportsPage = () => {
  const { formatCurrency, formatDate } = useFormatters();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [active, setActive] = useState("receivables");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5, 1);
    return d.toISOString().slice(0, 10);
  })();

  const [from, setFrom] = useState(sixMonthsAgo);
  const [to, setTo] = useState(today);

  const load = useCallback(async (a: string, b: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/reports?from=${a}&to=${b}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.error?.message || "Couldn't build that report."); return; }
      setError(null);
      setData(body.data);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(from, to); }, [load, from, to]);

  const report = data?.reports[active];

  const cell = (column: string, value: string | number) =>
    MONEY_COLUMNS.has(column) && typeof value === "number" ? formatCurrency(value) : String(value);

  return (
    <AdminLayout title="Reports" subtitle="Finance and operations, counted from real rows">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">FROM</p>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1">TO</p>
            <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)}
              className="bg-muted/40 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {data && (
            <p className="text-xs text-muted-foreground pb-2">
              {formatDate(data.range.from)} – {formatDate(data.range.to)}
            </p>
          )}
          {report && (
            <Btn variant="outline" className="ml-auto" onClick={() => exportCSV(
              report.rows.map(row => Object.fromEntries(report.columns.map((c, i) => [c, row[i]]))),
              `${active}-${from}-to-${to}.csv`,
            )}>
              <Download className="h-4 w-4" /> Export CSV
            </Btn>
          )}
        </div>
      </Card>

      {data && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
          {Object.entries(data.reports).map(([key, r]) => (
            <button key={key} onClick={() => setActive(key)}
              className={`rounded-2xl border p-4 text-left transition ${
                active === key
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card border-border/60 hover:shadow-card"
              }`}>
              <p className={`text-[10px] tracking-widest font-bold ${active === key ? "opacity-80" : "text-muted-foreground"}`}>
                REPORT
              </p>
              <p className={`font-display text-lg mt-1 ${active === key ? "" : "text-primary"}`}>{r.title}</p>
              <p className={`text-xs mt-1 ${active === key ? "opacity-80" : "text-muted-foreground"}`}>
                {r.rows.length} row{r.rows.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      <Card className="p-5 mt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Building…</p>
        ) : error ? (
          <div className="py-12 text-center">
            <ShieldAlert className="h-6 w-6 text-destructive mx-auto mb-3" />
            <p className="text-sm text-foreground/80">{error}</p>
            <Btn variant="outline" className="mt-4" onClick={() => void load(from, to)}>Try again</Btn>
          </div>
        ) : report ? (
          <>
            <SectionTitle
              title={report.title}
              action={<Pill tone="info">{report.rows.length} rows</Pill>}
            />
            <p className="text-xs text-muted-foreground -mt-2 mb-3">{report.note}</p>
            {report.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] tracking-widest text-muted-foreground">
                    <tr>{report.columns.map(c => (
                      <th key={c} className={`py-2 ${MONEY_COLUMNS.has(c) ? "text-right" : ""}`}>{c}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {row.map((value, j) => (
                          <td key={j} className={`py-2 ${MONEY_COLUMNS.has(report.columns[j]) ? "text-right" : ""}`}>
                            {cell(report.columns[j], value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nothing in this range. Widen the dates, or the rows behind this report do not exist yet.
              </p>
            )}

            {Object.keys(report.totals).length > 0 && (
              <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-3 border-t border-border/40">
                {Object.entries(report.totals).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label.toUpperCase()}</p>
                    <p className="font-semibold text-primary">
                      {["items", "low", "booked"].includes(label) ? value : formatCurrency(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            <FileBarChart className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
            Pick a report above.
          </p>
        )}
      </Card>
    </AdminLayout>
  );
};

export default ReportsPage;
