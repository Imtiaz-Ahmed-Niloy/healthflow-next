"use client";

import { ReactNode, useEffect, useState } from "react";
import { Download, FileSpreadsheet, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Btn, Card } from "@/components/admin/ui";
import { ConfirmDialog, DataTable, Modal, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { RecordFormFields, type FieldDef } from "@/components/admin/ResourcePage";
import {
  useCreateResourceMutation, useListResourceQuery, useRemoveResourceMutation, useUpdateResourceMutation,
} from "@/redux/api/createResourceApi";
import {
  Pager, PerPage, SearchBox, SortSelect, StateBlock, exportExcel, fetchAllRows, printTable, useDebounced, usePharmacyError,
} from "./ui";

/**
 * A list with a form, for the pharmacy's plain records: products, suppliers,
 * customers, expenses.
 *
 * ResourcePage does the same job for the admin panel, but it reads the first
 * hundred rows and searches those in the browser. A pharmacy has thousands of
 * products, so here the search and the paging are the server's: what is typed
 * goes to ?q=, and the table shows one page of what came back.
 *
 * The form itself is ResourcePage's own — same field definitions, same inputs.
 */

export type PagedResourceProps<T extends { id: string }> = {
  /** Module name under /api/v1. */
  resource: string;
  columns: Column<T>[];
  fields: FieldDef[];
  searchPlaceholder?: string;
  addLabel: string;
  newTitle: string;
  editTitle: string;
  /** Exact-match and range filters sent with every request. */
  filters?: Record<string, string | undefined>;
  /** Filter controls drawn beside the search box. */
  toolbar?: ReactNode;
  /** Other ways in, drawn left of the add button — an import, say. */
  beside?: ReactNode;
  /** Drawn above the table: totals for what is listed. */
  above?: ReactNode;
  empty?: string;
  /** What a new record starts with. */
  defaults?: Record<string, unknown>;
  /** Extra buttons per row, before edit and delete. */
  rowActions?: (row: T) => ReactNode;
  /** A line under the form. */
  formNote?: ReactNode;
  /** Said in the confirmation, in place of "this cannot be undone". */
  deleteHint?: string;
  /** Adds an export of everything that matches the search and filters, saved under this name. */
  exportName?: string;
  limit?: number;
  /** False for a login that may read these records but not change them: no add, edit or delete. */
  canWrite?: boolean;
  /** The orders the list can be put in. `value` is "<column>:asc" or "<column>:desc"; the first is the default. */
  sorts?: { value: string; label: string }[];
  /** With `exportName`: also offer the same rows as an Excel workbook and as a printed report with this title. */
  reportTitle?: string;
};

/** Selects compare by string, and a row's booleans would never match "true". */
const forForm = (row: Record<string, unknown> | undefined) =>
  row ? Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v])) : null;

export function PagedResource<T extends { id: string }>({
  resource, columns, fields, searchPlaceholder, addLabel, newTitle, editTitle, filters, toolbar, beside, above,
  empty, defaults, rowActions, formNote, deleteHint, exportName, limit = 20, canWrite = true, sorts, reportTitle,
}: PagedResourceProps<T>) {
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(limit);
  const [sort, setSort] = useState(sorts?.[0]?.value ?? "");
  const search = useDebounced(q);
  const filterKey = JSON.stringify(filters ?? {});
  const [sortColumn, sortOrder] = sort.split(":") as [string, "asc" | "desc" | undefined];

  // A new search, filter, order or page size starts from its own first page.
  useEffect(() => { setPage(1); }, [search, filterKey, sort, perPage]);

  const { data, isLoading, isFetching, error, refetch } = useListResourceQuery({
    resource, page, limit: perPage, q: search, filters, ...(sortColumn ? { sort: sortColumn, order: sortOrder ?? "asc" } : {}),
  });
  const rows = (data?.data ?? []) as T[];
  const meta = data?.meta;

  const [create, creating] = useCreateResourceMutation();
  const [update, updating] = useUpdateResourceMutation();
  const [remove] = useRemoveResourceMutation();

  const [editing, setEditing] = useState<T | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<T | null>(null);
  const busy = creating.isLoading || updating.isLoading;
  const open = adding || editing !== null;

  const close = () => { setAdding(false); setEditing(null); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (editing) await update({ resource, id: editing.id, body }).unwrap();
      else await create({ resource, body }).unwrap();
      toast.success(tc("saved"));
      close();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const [exporting, setExporting] = useState(false);

  /** Everything that matches, as plain cells: nested lists and objects are left out of a flat file. */
  const allRows = async () => {
    const all = await fetchAllRows<Record<string, unknown>>(resource, { ...filters, q: search || undefined });
    return all.map(row => Object.fromEntries(
      Object.entries(row)
        .filter(([key, value]) => key !== "tenant_id" && (value === null || typeof value !== "object"))
        .map(([key, value]) => [key, typeof value === "boolean" ? String(value) : (value as string | number | null)]),
    ));
  };

  const download = async (kind: "csv" | "excel" | "print") => {
    setExporting(true);
    try {
      const all = await allRows();
      if (kind === "csv") exportCSV(all, `${exportName}.csv`);
      else if (kind === "excel") await exportExcel(all, `${exportName}.xlsx`);
      else if (!printTable(reportTitle ?? "", tc("records", { count: all.length }), all)) toast.error(tc("popupBlocked"));
    } catch (cause) {
      toast.error(describe(cause));
    } finally {
      setExporting(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove({ resource, id: removing.id }).unwrap();
      toast.success(tc("deleted"));
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <>
      {above}
      <Card className="p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBox value={q} onChange={setQ} placeholder={searchPlaceholder} className="flex-1" />
          {toolbar}
          {sorts && <SortSelect value={sort} onChange={setSort} options={sorts} />}
          <PerPage value={perPage} onChange={setPerPage} />
          {exportName && (
            <Btn variant="outline" onClick={() => download("csv")} disabled={exporting || rows.length === 0}>
              <Download className="h-4 w-4" /> {tc("exportCsv")}
            </Btn>
          )}
          {exportName && reportTitle && <>
            <Btn variant="outline" onClick={() => download("excel")} disabled={exporting || rows.length === 0}>
              <FileSpreadsheet className="h-4 w-4" /> {tc("excel")}
            </Btn>
            <Btn variant="outline" onClick={() => download("print")} disabled={exporting || rows.length === 0}>
              <Printer className="h-4 w-4" /> {tc("print")}
            </Btn>
          </>}
          {beside}
          {canWrite && <Btn onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {addLabel}</Btn>}
        </div>

        {isLoading || error || rows.length === 0 ? (
          <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={empty} />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable<T> rows={rows} columns={columns} onRow={canWrite ? row => setEditing(row) : undefined}
              actions={canWrite
                ? row => <RowActions before={rowActions?.(row)} onEdit={() => setEditing(row)} onDelete={() => setRemoving(row)} />
                : rowActions ? row => <div className="inline-flex items-center gap-1">{rowActions(row)}</div> : undefined} />
          </div>
        )}

        {meta && <Pager page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
      </Card>

      <Modal open={open} onClose={close} title={editing ? editTitle : newTitle} size="lg">
        <form onSubmit={submit}>
          <RecordFormFields key={editing?.id ?? "new"} fields={fields}
            editing={forForm((editing as Record<string, unknown> | null) ?? defaults)} />
          {formNote && <p className="text-[11px] text-muted-foreground -mt-1 mb-4">{formNote}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
            <Btn type="submit" disabled={busy}>{busy ? tc("saving") : tc("save")}</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={confirmRemove}
        title={tc("confirmDelete")} description={deleteHint ?? tc("cannotUndo")} />
    </>
  );
}
