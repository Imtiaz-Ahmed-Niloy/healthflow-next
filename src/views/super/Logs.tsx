"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle, ChevronDown, ChevronRight, ChevronLeft, Download, FilePlus2,
  FileX2, Pencil, Search, Shield, X,
} from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { auditLogsApi, type AuditLogRow } from "@/redux/api/resources";
import { formatDate, formatTime, useAppSettings } from "@/lib/appSettings";
import { useRoleLabel } from "@/i18n/useRoleLabel";
import type { AppRole } from "@/lib/auth/permissions";

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
 *
 * Table and column names stay as the database spells them — this is the
 * screen for finding the row, and a translated name would not find it.
 */

const PAGE_SIZE = 25;

const ACTION_TONE = { insert: "ok", update: "info", delete: "bad" } as const;
const ACTION_ICON = { insert: FilePlus2, update: Pencil, delete: FileX2 } as const;

const KNOWN_ROLES: readonly string[] = [
  "super_admin", "hospital_admin", "hr_admin", "finance_admin", "lab_admin", "pharmacy_admin", "doctor", "patient",
];

/** `payroll_runs` reads as "Payroll runs" without a lookup table to maintain. */
const humanTable = (name: string) => {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const Logs = () => {
  const t = useTranslations("super.logs");
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
    // Machine-readable on purpose: the columns and values are the database's.
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
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <Card className="p-5">
        <SectionTitle
          title={t("trail")}
          action={
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {meta ? t("events", { count: meta.total }) : "—"}
              </p>
              <Btn variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="h-4 w-4" /> {t("exportPage")}
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
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className="h-9 w-60 pl-9 pr-3 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          <select
            value={action}
            onChange={(e) => onFilter(() => setAction(e.target.value))}
            aria-label={t("actionLabel")}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">{t("anything")}</option>
            <option value="insert">{t("actions.insert")}</option>
            <option value="update">{t("actions.update")}</option>
            <option value="delete">{t("actions.delete")}</option>
          </select>

          <select
            value={table}
            onChange={(e) => onFilter(() => setTable(e.target.value))}
            aria-label={t("tableLabel")}
            className="h-9 max-w-[220px] rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">{t("allTables")}</option>
            {tableOptions.map((name) => (
              <option key={name} value={name}>{humanTable(name)}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-sm font-semibold hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" /> {t("clear")}
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
            <p className="text-sm font-semibold">{t("loadFailed")}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-10 text-center">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilter ? t("noMatch") : t("nothingYet")}
            </p>
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
              <table className="w-full text-sm min-w-[820px]">
                <thead className="text-left text-[10px] tracking-widest text-muted-foreground bg-muted/30 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">{t("columns.when")}</th>
                    <th>{t("columns.who")}</th>
                    <th>{t("columns.what")}</th>
                    <th>{t("columns.where")}</th>
                    <th>{t("columns.hospital")}</th>
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
                  {t("pageOf", { page: meta.page, total: meta.totalPages })}
                </p>
                <div className="flex items-center gap-2">
                  <Btn
                    variant="outline"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); setExpanded(null); }}
                    disabled={page <= 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("newer")}
                  </Btn>
                  <Btn
                    variant="outline"
                    onClick={() => { setPage((p) => p + 1); setExpanded(null); }}
                    disabled={page >= meta.totalPages || isFetching}
                  >
                    {t("older")} <ChevronRight className="h-4 w-4" />
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">{t("footnote")}</p>
    </SuperLayout>
  );
};

const Row = ({ row, open, onToggle }: { row: AuditLogRow; open: boolean; onToggle: () => void }) => {
  const t = useTranslations("super.logs");
  const roleLabel = useRoleLabel();
  const Icon = ACTION_ICON[row.action];
  const when = new Date(row.occurred_at);
  const details = row.details as { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
  const expandable = row.changed_fields.length > 0 || !!details;
  const role = row.actor_role
    ? KNOWN_ROLES.includes(row.actor_role) ? roleLabel(row.actor_role as AppRole) : row.actor_role.replace(/_/g, " ")
    : null;

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
              {role && (
                <span className="block text-[11px] text-muted-foreground">{role}</span>
              )}
            </>
          ) : (
            // No JWT behind the change: the service key, a migration, or the
            // SQL editor. Named as such rather than blamed on a person.
            <span className="text-muted-foreground italic">{t("system")}</span>
          )}
        </td>
        <td>
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <Pill tone={ACTION_TONE[row.action]}>{t(`actions.${row.action}`)}</Pill>
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
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5 uppercase">
                  {t("columnsChanged")}
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
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5 uppercase">
                      {side === "old" ? t("before") : t("after")}
                    </p>
                    <pre className="max-h-56 overflow-auto rounded-lg bg-card border border-border/60 p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(details[side] ?? {}, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("valuesNotRecorded")}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

export default Logs;
