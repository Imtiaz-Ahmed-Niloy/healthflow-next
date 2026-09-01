"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle, ChevronDown, ChevronRight, ChevronLeft, Download, FilePlus2,
  FileX2, Pencil, Search, Shield, X,
} from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { auditLogsApi, type AuditLogRow } from "@/redux/api/resources";
import { formatDate, formatTime, useAppSettings } from "@/lib/appSettings";

/**
 * Every write in the database, from `public.audit_logs` (0058).
 *
 * The screen this replaces showed five hardcoded lines — the same five for
 * every viewer on every day since they were typed. An audit trail that is
 * fiction is worse than none, because it is the screen someone opens when they
 * need to know who changed something.
 *
 * Entries come from a trigger on all 48 tables, so what is listed here is not
 * "what the API did" — it is what the database did, including changes made in
 * the SQL editor or by a script holding the service key. Nothing here can be
 * added or removed through the app: the table has no write policy at all.
 */

const PAGE_SIZE = 25;

const ACTION_TONE = { insert: "ok", update: "info", delete: "bad" } as const;
const ACTION_ICON = { insert: FilePlus2, update: Pencil, delete: FileX2 } as const;
const ACTION_LABEL = { insert: "Created", update: "Updated", delete: "Deleted" } as const;

/** `payroll_runs` reads as "Payroll runs" without a lookup table to maintain. */
const humanTable = (name: string) => {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const humanRole = (role: string | null) => (role ? role.replace(/_/g, " ") : null);

const Logs = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [table, setTable] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  // Re-renders as the platform's timezone and clock format arrive, so
  // timestamps are shown in the timezone this platform runs in.
  useAppSettings();

  const { data, isLoading, error, isFetching } = auditLogsApi.useList({
    page,
    limit: PAGE_SIZE,
    q: search.trim() || undefined,
    ...(action !== "all" ? { action } : {}),
    ...(table !== "all" ? { table_name: table } : {}),
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  /**
   * Built from the page in hand rather than from a catalogue of every table.
   * A picker listing 48 tables, most of which have never been written to, is
   * longer and less useful than one listing what is actually in the log.
   */
  const tableOptions = useMemo(() => {
    const names = new Set(rows.map((row) => row.table_name));
    if (table !== "all") names.add(table);
    return [...names].sort();
  }, [rows, table]);

  const hasFilter = search !== "" || action !== "all" || table !== "all";
  const clearFilters = () => { setSearch(""); setAction("all"); setTable("all"); setPage(1); };

  const onFilter = (fn: () => void) => { fn(); setPage(1); setExpanded(null); };

  const exportCsv = () => {
    const header = ["when", "actor", "role", "action", "table", "record", "hospital", "changed"];
    const lines = rows.map((row) => [
      row.occurred_at,
      row.actor_email ?? "",
      row.actor_role ?? "",
      row.action,
      row.table_name,
      row.record_id ?? "",
      row.tenant_name ?? "",
      row.changed_fields.join(" "),
    ]);
    // Quoted and doubled, so a hospital name with a comma in it cannot shift
    // every following column one to the left.
    const csv = [header, ...lines]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `healthflow-audit-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SuperLayout title="System Logs" subtitle="Every write, as the database saw it">
      <Card className="p-5">
        <SectionTitle
          title="Audit trail"
          action={
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {meta ? `${meta.total.toLocaleString()} events` : "—"}
              </p>
              <Btn variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="h-4 w-4" /> Export page
              </Btn>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onFilter(() => setSearch(e.target.value))}
              placeholder="Who or which table…"
              aria-label="Search the audit trail"
              className="h-9 w-60 pl-9 pr-3 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <select
            value={action}
            onChange={(e) => onFilter(() => setAction(e.target.value))}
            aria-label="Filter by what happened"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Anything</option>
            <option value="insert">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
          </select>

          <select
            value={table}
            onChange={(e) => onFilter(() => setTable(e.target.value))}
            aria-label="Filter by table"
            className="h-9 max-w-[220px] rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">All tables</option>
            {tableOptions.map((name) => (
              <option key={name} value={name}>{humanTable(name)}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl bg-destructive/10 text-destructive p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Could not load the audit trail. Refresh to try again.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-10 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilter ? "No events match those filters." : "Nothing has been written yet."}
            </p>
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
              <table className="w-full text-sm min-w-[820px]">
                <thead className="text-left text-[10px] tracking-widest text-muted-foreground bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5">WHEN</th>
                    <th>WHO</th>
                    <th>WHAT</th>
                    <th>WHERE</th>
                    <th>HOSPITAL</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      open={expanded === row.id}
                      onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Btn
                    variant="outline"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); setExpanded(null); }}
                    disabled={page <= 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4" /> Newer
                  </Btn>
                  <Btn
                    variant="outline"
                    onClick={() => { setPage((p) => p + 1); setExpanded(null); }}
                    disabled={page >= meta.totalPages || isFetching}
                  >
                    Older <ChevronRight className="h-4 w-4" />
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Written by a database trigger, so a change made in the SQL editor or by a script is
        here too — not only what went through the app. Values are recorded for platform and
        content tables; for everything else the trail names the columns that changed but not
        what they hold, so patient and payroll data is not copied into a second place.
        Nothing here can be edited or deleted, by anyone.
      </p>
    </SuperLayout>
  );
};

const Row = ({ row, open, onToggle }: { row: AuditLogRow; open: boolean; onToggle: () => void }) => {
  const Icon = ACTION_ICON[row.action];
  const when = new Date(row.occurred_at);
  const details = row.details as { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
  const expandable = row.changed_fields.length > 0 || !!details;

  return (
    <>
      <tr
        className={`border-t border-border/40 ${expandable ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={expandable ? onToggle : undefined}
      >
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono text-xs">{formatTime(when)}</span>
          <span className="block text-[11px] text-muted-foreground">{formatDate(when)}</span>
        </td>
        <td>
          {row.actor_email ? (
            <>
              <span className="font-semibold text-primary">{row.actor_email}</span>
              {row.actor_role && (
                <span className="block text-[11px] text-muted-foreground capitalize">
                  {humanRole(row.actor_role)}
                </span>
              )}
            </>
          ) : (
            // No JWT behind the change: the service key, a migration, or the
            // SQL editor. Named as such rather than blamed on a person.
            <span className="text-muted-foreground italic">System</span>
          )}
        </td>
        <td>
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <Pill tone={ACTION_TONE[row.action]}>{ACTION_LABEL[row.action]}</Pill>
          </span>
        </td>
        <td>
          <span className="font-medium">{humanTable(row.table_name)}</span>
          {row.record_id && (
            <span className="block font-mono text-[11px] text-muted-foreground">
              {row.record_id.slice(0, 8)}
            </span>
          )}
        </td>
        {/* The name as it was when the change happened, not as it reads now —
            the row carries its own copy. */}
        <td className="text-muted-foreground">{row.tenant_name ?? "—"}</td>
        <td className="pr-4 text-right">
          {expandable && (
            <ChevronDown className={`inline h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          )}
        </td>
      </tr>

      {open && (
        <tr className="border-t border-border/20 bg-muted/20">
          <td colSpan={6} className="px-4 py-4">
            {row.changed_fields.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">
                  COLUMNS CHANGED
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {row.changed_fields.map((field) => (
                    <span key={field} className="rounded-md bg-card border border-border/60 px-2 py-0.5 font-mono text-[11px]">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {details ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {(["old", "new"] as const).map((side) => (
                  <div key={side}>
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">
                      {side === "old" ? "BEFORE" : "AFTER"}
                    </p>
                    <pre className="max-h-56 overflow-auto rounded-lg bg-card border border-border/60 p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(details[side] ?? {}, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Values are not recorded for this table — the trail says which columns changed,
                not what they hold.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

export default Logs;
