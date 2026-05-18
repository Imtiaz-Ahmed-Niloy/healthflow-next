import { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Download, Plus, Trash2, Pencil, Eye, X, ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Card, Btn, Pill } from "./ui";
import { load, save, uid } from "@/lib/storage";
import { can, getRole, type Action } from "@/lib/rbac";

// ============ useCrud hook ============
export function useCrud<T extends { id: string }>(key: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(() => load(key, seed));
  useEffect(() => { save(key, items); }, [key, items]);
  return {
    items, setItems,
    create: (it: Omit<T, "id">) => { const r = { ...it, id: uid() } as T; setItems(p => [r, ...p]); toast.success("Created"); return r; },
    update: (id: string, patch: Partial<T>) => { setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i)); toast.success("Updated"); },
    remove: (id: string) => { setItems(p => p.filter(i => i.id !== id)); toast.success("Deleted"); },
    bulkRemove: (ids: string[]) => { setItems(p => p.filter(i => !ids.includes(i.id))); toast.success(`${ids.length} removed`); },
    reset: () => { setItems(seed); save(key, seed); toast.info("Reset to defaults"); },
  };
}

// ============ Modal ============
export const Modal = ({ open, onClose, title, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}) => {
  if (!open) return null;
  const w = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col border border-border/60`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h3 className="font-display text-xl text-primary">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border/40 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

// ============ Drawer ============
export const Drawer = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border/60 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h3 className="font-display text-xl text-primary">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
};

// ============ Confirm ============
export const ConfirmDialog = ({ open, onClose, onConfirm, title = "Are you sure?", description }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title?: string; description?: string;
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm"
    footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn variant="danger" onClick={() => { onConfirm(); onClose(); }}>Confirm</Btn></>}>
    <p className="text-sm text-muted-foreground">{description || "This action cannot be undone."}</p>
  </Modal>
);

// ============ FormField ============
export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <div className="mb-4">
    <label className="block text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">{label.toUpperCase()}</label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm";
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className || ""}`} />;
export const TextArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={`${inputCls} ${p.className || ""}`} />;
export const Select = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${inputCls} ${p.className || ""}`}>{children}</select>
);

// ============ Toolbar ============
export const Toolbar = ({ search, onSearch, onAdd, onExport, addLabel = "New", filters, bulkCount, onBulkDelete, right }: {
  search: string; onSearch: (v: string) => void; onAdd?: () => void; onExport?: () => void; addLabel?: string;
  filters?: ReactNode; bulkCount?: number; onBulkDelete?: () => void; right?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center gap-3 mb-4">
    <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-muted/40 rounded-full px-4 py-2">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search…" className="bg-transparent outline-none text-sm flex-1" />
    </div>
    {filters}
    {bulkCount! > 0 && onBulkDelete && (
      <Btn variant="danger" onClick={onBulkDelete}><Trash2 className="h-4 w-4" /> {bulkCount}</Btn>
    )}
    {right}
    {onExport && <Btn variant="outline" onClick={onExport}><Download className="h-4 w-4" /> Export</Btn>}
    {onAdd && <Btn onClick={onAdd}><Plus className="h-4 w-4" /> {addLabel}</Btn>}
  </div>
);

// ============ DataTable ============
export type Column<T> = {
  key: string; label: string; render?: (row: T) => ReactNode; sortable?: boolean; width?: string;
  accessor?: (row: T) => string | number;
};
export function DataTable<T extends { id: string }>({ rows, columns, onRow, selected, onSelect, actions, empty }: {
  rows: T[]; columns: Column<T>[]; onRow?: (r: T) => void;
  selected?: string[]; onSelect?: (ids: string[]) => void;
  actions?: (row: T) => ReactNode; empty?: string;
}) {
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.k);
    if (!col?.accessor) return rows;
    return [...rows].sort((a, b) => {
      const A = col.accessor!(a), B = col.accessor!(b);
      return A > B ? sort.dir : A < B ? -sort.dir : 0;
    });
  }, [rows, sort, columns]);

  const allChecked = onSelect && rows.length > 0 && selected!.length === rows.length;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/40">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-muted/30 text-left text-[10px] tracking-widest text-muted-foreground sticky top-0">
          <tr>
            {onSelect && (
              <th className="w-10 px-3">
                <input type="checkbox" checked={!!allChecked}
                  onChange={e => onSelect(e.target.checked ? rows.map(r => r.id) : [])} />
              </th>
            )}
            {columns.map(c => (
              <th key={c.key} className="py-3 px-3 font-bold" style={{ width: c.width }}>
                <button className="inline-flex items-center gap-1 hover:text-primary"
                  onClick={() => c.sortable && setSort(s => s?.k === c.key ? { k: c.key, dir: -s.dir as 1 | -1 } : { k: c.key, dir: 1 })}>
                  {c.label}
                  {c.sortable && sort?.k === c.key && (sort.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                </button>
              </th>
            ))}
            {actions && <th className="px-3 w-20" />}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={columns.length + (onSelect ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12 text-muted-foreground text-sm">{empty || "No records"}</td></tr>
          )}
          {sorted.map(r => (
            <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20 cursor-pointer"
              onClick={() => onRow?.(r)}>
              {onSelect && (
                <td className="px-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected!.includes(r.id)}
                    onChange={e => onSelect(e.target.checked ? [...selected!, r.id] : selected!.filter(i => i !== r.id))} />
                </td>
              )}
              {columns.map(c => <td key={c.key} className="py-3 px-3 align-middle">{c.render ? c.render(r) : (c.accessor?.(r) ?? "")}</td>)}
              {actions && <td className="px-3 text-right" onClick={e => e.stopPropagation()}>{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Row actions ============
export const RowActions = ({ onView, onEdit, onDelete, extra }: {
  onView?: () => void; onEdit?: () => void; onDelete?: () => void; extra?: ReactNode;
}) => (
  <div className="inline-flex items-center gap-1">
    {onView && <button onClick={onView} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70" title="View"><Eye className="h-4 w-4" /></button>}
    {onEdit && <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70" title="Edit"><Pencil className="h-4 w-4" /></button>}
    {onDelete && <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>}
    {extra}
  </div>
);

// ============ Filter chip group ============
export const Chips = <T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) => (
  <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1">
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${value === o.value ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"}`}>
        {o.label}
      </button>
    ))}
  </div>
);

// ============ CSV export ============
export const exportCSV = <T extends Record<string, unknown>>(rows: T[], filename: string) => {
  if (!rows.length) { toast.error("Nothing to export"); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported CSV");
};

// ============ Can wrapper ============
export const Can = ({ action, resource, children, fallback = null }: { action: Action; resource: string; children: ReactNode; fallback?: ReactNode }) => {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    window.addEventListener("hf:role", f);
    return () => window.removeEventListener("hf:role", f);
  }, []);
  return can(action, resource, getRole()) ? <>{children}</> : <>{fallback}</>;
};

// ============ Status pill helper ============
export const statusTone = (s: string): "ok" | "warn" | "bad" | "info" | "default" => {
  const x = s.toLowerCase();
  if (["active", "approved", "paid", "delivered", "completed", "published", "reported", "resolved"].includes(x)) return "ok";
  if (["pending", "draft", "processing", "trial", "scheduled", "ordered"].includes(x)) return "warn";
  if (["overdue", "rejected", "suspended", "cancelled", "failed"].includes(x)) return "bad";
  if (["info", "review", "new"].includes(x)) return "info";
  return "default";
};
