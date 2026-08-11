"use client";

import { ReactNode, useState, useMemo, useRef, useEffect } from "react";
import { Upload, X, Plus, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, FileText, Paperclip, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Pill } from "./ui";
import { DataTable, Toolbar, Modal, ConfirmDialog, RowActions, Drawer, exportCSV, useCrud, Field, Input, Select, Chips, statusTone, type Column } from "./crud";
import { useResourceCrud } from "./useResourceCrud";

function ImageUploadField({ name, required, defaultValue }: { name: string; required?: boolean; defaultValue?: string }) {
  const [preview, setPreview] = useState<string>(defaultValue || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 rounded-xl bg-muted/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
        {preview ? <img src={preview} alt="preview" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1">
        <input type="hidden" name={name} value={preview} required={required} />
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {preview ? "Change" : "Upload"} photo
          </button>
          {preview && (
            <button type="button" onClick={() => setPreview("")}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">PNG or JPG, up to a few MB.</p>
      </div>
    </div>
  );
}

type DocFile = { name: string; type: string; data: string };

function FileUploadField({ name, required, defaultValue, accept = "image/*,application/pdf", hint }: { name: string; required?: boolean; defaultValue?: string; accept?: string; hint?: string }) {
  const init: DocFile | null = (() => {
    if (!defaultValue) return null;
    try { const p = JSON.parse(defaultValue); if (p && p.data) return p as DocFile; } catch { /* ignore */ }
    if (typeof defaultValue === "string" && defaultValue.startsWith("data:")) return { name: "document", type: defaultValue.slice(5, defaultValue.indexOf(";")) || "application/octet-stream", data: defaultValue };
    return null;
  })();
  const [file, setFile] = useState<DocFile | null>(init);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, type: f.type, data: String(reader.result || "") });
    reader.readAsDataURL(f);
  };
  const isImage = file?.type?.startsWith("image/");
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-xl bg-muted/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
        {file ? (isImage ? <img src={file.data} alt={file.name} className="h-full w-full object-cover" /> : <FileText className="h-7 w-7 text-primary" />) : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <input type="hidden" name={name} value={file ? JSON.stringify(file) : ""} required={required} />
        <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {file ? "Replace" : "Upload"} file
          </button>
          {file && (
            <>
              <a href={file.data} target="_blank" rel="noreferrer" download={file.name}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> {file.name}
              </a>
              <button type="button" onClick={() => setFile(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{hint || "PDF, PNG or JPG."}</p>
      </div>
    </div>
  );
}

function FilesUploadField({ name, defaultValue, accept = "image/*,application/pdf", hint }: { name: string; defaultValue?: string; accept?: string; hint?: string }) {
  const init: DocFile[] = (() => {
    if (!defaultValue) return [];
    try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p as DocFile[]; } catch { /* ignore */ }
    return [];
  })();
  const [files, setFiles] = useState<DocFile[]>(init);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    Promise.all(list.map(f => new Promise<DocFile>(res => {
      const r = new FileReader();
      r.onload = () => res({ name: f.name, type: f.type, data: String(r.result || "") });
      r.readAsDataURL(f);
    }))).then(added => setFiles(prev => [...prev, ...added]));
    if (inputRef.current) inputRef.current.value = "";
  };
  const remove = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      <input ref={inputRef} type="file" accept={accept} multiple onChange={onPick} className="hidden" />
      {files.length > 0 && (
        <ul className="space-y-2 mb-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              {f.type?.startsWith("image/") ? <img src={f.data} alt={f.name} className="h-8 w-8 rounded object-cover" /> : <FileText className="h-5 w-5 text-primary" />}
              <a href={f.data} download={f.name} target="_blank" rel="noreferrer" className="flex-1 text-sm truncate hover:underline">{f.name}</a>
              <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-md hover:bg-background" title="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => inputRef.current?.click()}
        className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add license / document
      </button>
      <p className="text-[11px] text-muted-foreground mt-1.5">{hint || "Add multiple PDFs or images."}</p>
    </div>
  );
}

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter(Boolean); } catch { /* fallthrough */ }
    return v.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function ListField({ name, defaultValue, inputType = "text", placeholder }: { name: string; defaultValue?: unknown; inputType?: string; placeholder?: string }) {
  const [items, setItems] = useState<string[]>(() => {
    const arr = parseList(defaultValue);
    return arr.length ? arr : [""];
  });
  const update = (i: number, v: string) => setItems(p => p.map((x, idx) => idx === i ? v : x));
  const add = () => setItems(p => [...p, ""]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [""] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(Boolean))} />
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type={inputType} value={val} onChange={e => update(i, e.target.value)} placeholder={placeholder}
            className="flex-1 bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
          <button type="button" onClick={() => remove(i)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "twitter", label: "Twitter / X", Icon: Twitter },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "other", label: "Other", Icon: Globe },
];

type SocialLink = { platform: string; url: string };

function SocialField({ name, defaultValue }: { name: string; defaultValue?: unknown }) {
  const [items, setItems] = useState<SocialLink[]>(() => {
    if (typeof defaultValue === "string" && defaultValue.trim()) {
      try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p; } catch { /* ignore */ }
    }
    if (Array.isArray(defaultValue)) return defaultValue as SocialLink[];
    return [{ platform: "facebook", url: "" }];
  });
  const update = (i: number, patch: Partial<SocialLink>) =>
    setItems(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setItems(p => [...p, { platform: "facebook", url: "" }]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [{ platform: "facebook", url: "" }] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(s => s.url))} />
      {items.map((s, i) => {
        const def = SOCIAL_PLATFORMS.find(p => p.key === s.platform) || SOCIAL_PLATFORMS[5];
        const Icon = def.Icon;
        return (
          <div key={i} className="flex items-center gap-2">
            <select value={s.platform} onChange={e => update(i, { platform: e.target.value })}
              className="bg-muted/40 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
              {SOCIAL_PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="url" value={s.url} onChange={e => update(i, { url: e.target.value })}
                placeholder="https://…"
                className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
            <button type="button" onClick={() => remove(i)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Add link
      </button>
    </div>
  );
}

// ============ People (members) field ============
type Person = { name: string; role: string; phone: string; email: string };

function PeopleField({ name, defaultValue, roleOptions, addLabel }: { name: string; defaultValue?: unknown; roleOptions?: string[]; addLabel?: string }) {
  const [items, setItems] = useState<Person[]>(() => {
    if (typeof defaultValue === "string" && defaultValue.trim()) {
      try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p as Person[]; } catch { /* ignore */ }
    }
    if (Array.isArray(defaultValue)) return defaultValue as Person[];
    return [{ name: "", role: roleOptions?.[0] || "", phone: "", email: "" }];
  });
  const update = (i: number, patch: Partial<Person>) =>
    setItems(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setItems(p => [...p, { name: "", role: roleOptions?.[0] || "", phone: "", email: "" }]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [{ name: "", role: roleOptions?.[0] || "", phone: "", email: "" }] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(m => m.name || m.role))} />
      {items.map((m, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <User className="h-3.5 w-3.5" /> Member {i + 1}
            </div>
            <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg border border-border hover:bg-muted" title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={m.name} onChange={e => update(i, { name: e.target.value })} placeholder="Full name"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            {roleOptions && roleOptions.length > 0 ? (
              <select value={m.role} onChange={e => update(i, { role: e.target.value })}
                className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60">
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input value={m.role} onChange={e => update(i, { role: e.target.value })} placeholder="Role / designation"
                className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            )}
            <input type="tel" value={m.phone} onChange={e => update(i, { phone: e.target.value })} placeholder="Phone"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            <input type="email" value={m.email} onChange={e => update(i, { email: e.target.value })} placeholder="Email"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> {addLabel || "Add member"}
      </button>
    </div>
  );
}

export type FieldDef = (
  | { name: string; label: string; type: "text" | "email" | "tel" | "number" | "date"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "textarea"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "image"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "file"; accept?: string; hint?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "files"; accept?: string; hint?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "list"; itemType?: "text" | "email" | "tel" | "url"; placeholder?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "social"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "people"; roleOptions?: string[]; addLabel?: string; required?: boolean; fullWidth?: boolean }
) & { step?: number };

export type FormStep = { id: number; label: string };

export function RecordFormFields({
  fields, editing, activeStepId, stepIds,
}: {
  fields: FieldDef[];
  editing: Record<string, unknown> | null;
  activeStepId?: number;
  stepIds?: number[];
}) {
  const ids = stepIds && stepIds.length ? stepIds : [1];
  return (
    <div className="grid grid-cols-2 gap-x-4">
      {fields.map(f => {
        const fieldStep = f.step ?? ids[0];
        const hidden = activeStepId !== undefined ? fieldStep !== activeStepId : false;
        const wide = f.fullWidth || f.type === "textarea" || f.type === "image" || f.type === "file" || f.type === "files" || f.type === "list" || f.type === "social" || f.type === "people";
        return (
          <div key={f.name} className={`${wide ? "col-span-2" : ""} ${hidden ? "hidden" : ""}`}>
            <Field label={f.label}>
              {f.type === "select" ? (
                <Select name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? f.options[0]}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : f.type === "textarea" ? (
                <textarea name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} rows={3}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
              ) : f.type === "image" ? (
                <ImageUploadField name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "file" ? (
                <FileUploadField name={f.name} required={f.required} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "files" ? (
                <FilesUploadField name={f.name} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "list" ? (
                <ListField name={f.name} inputType={f.itemType ?? "text"} placeholder={f.placeholder}
                  defaultValue={(editing as never)?.[f.name]} />
              ) : f.type === "social" ? (
                <SocialField name={f.name} defaultValue={(editing as never)?.[f.name]} />
              ) : f.type === "people" ? (
                <PeopleField name={f.name} defaultValue={(editing as never)?.[f.name]} roleOptions={f.roleOptions} addLabel={f.addLabel} />
              ) : (
                <Input name={f.name} type={f.type} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} />
              )}
            </Field>
          </div>
        );
      })}
    </div>
  );
}

export type ResourceConfig<T extends { id: string; status?: string }> = {
  storeKey: string;
  /**
   * Module name under /api/v1. When set, the page reads and writes real data
   * through RTK Query and `seed` is ignored. When absent it falls back to the
   * original localStorage behaviour, so pages not yet migrated are unaffected.
   */
  resource?: string;
  seed?: T[];
  searchFields: (keyof T)[];
  columns: Column<T>[];
  fields: FieldDef[];
  steps?: FormStep[];
  /**
   * Status filter chips. Plain strings show as-is; pass { value, label } when
   * the stored value is not what a human should read — a database enum like
   * "pending" or "on_leave" needs a label.
   */
  statuses?: (string | { value: string; label: string })[];
  exportName?: string;
  addLabel?: string;
  defaults?: Partial<T>;
  onCreate?: (record: T) => void;
  onUpdate?: (record: T) => void;
  extraFilters?: ReactNode;
  filterFn?: (row: T) => boolean;
  /**
   * Extra buttons per row, rendered before View / Edit / Delete. Use for module
   * actions that are not CRUD — approving a hospital, say.
   */
  rowActions?: (row: T) => ReactNode;
};

/**
 * Widgets that post JSON in a hidden input. Their values must be parsed before
 * submit, because Postgres text[] and jsonb columns cannot accept a JSON string.
 *
 * `image` / `file` / `files` are deliberately absent: they embed base64 data
 * URIs and their consumers still expect the string form.
 */
const JSON_VALUED_TYPES = new Set(["list", "social", "people"]);

export function ResourcePage<T extends { id: string; status?: string }>({ config, extra }: { config: ResourceConfig<T>; extra?: ReactNode }) {
  // Both hooks run every render — React forbids calling one conditionally.
  // useResourceCrud skips its request when config.resource is undefined, and
  // useCrud is cheap, so the unused one costs nothing.
  const local = useCrud<T>(config.storeKey, config.seed ?? []);
  const remote = useResourceCrud<T>(config.resource);
  const crud = config.resource ? remote : local;
  const isLoading = config.resource ? remote.isLoading : false;
  const loadError = config.resource ? remote.error : undefined;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [step, setStep] = useState(0);

  const steps = config.steps && config.steps.length > 0 ? config.steps : null;
  const stepIds = steps ? steps.map(s => s.id) : [1];
  const activeStepId = steps ? steps[step]?.id ?? steps[0].id : 1;
  const isLastStep = !steps || step >= (steps.length - 1);
  const isFirstStep = step === 0;

  useEffect(() => { if (creating || editing) setStep(0); }, [creating, editing]);

  const rows = useMemo(() => crud.items.filter(i => {
    const inSearch = !q || config.searchFields.some(f => String((i as never)[f] ?? "").toLowerCase().includes(q.toLowerCase()));
    const inStatus = status === "all" || (i.status || "").toLowerCase() === status.toLowerCase();
    const inExtra = !config.filterFn || config.filterFn(i);
    return inSearch && inStatus && inExtra;
  }), [crud.items, q, status, config]);

  return (
    <>
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setCreating(true)} addLabel={config.addLabel || "New"}
          onExport={() => exportCSV(rows as never, `${config.exportName || config.storeKey}.csv`)}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={(config.statuses || config.extraFilters) && (
            <div className="flex flex-wrap items-center gap-2">
              {config.statuses && (
                <Chips value={status as never} onChange={setStatus as never}
                  options={[
                    { value: "all", label: "All" },
                    ...config.statuses.map(s => (typeof s === "string" ? { value: s, label: s } : s)),
                  ]} />
              )}
              {config.extraFilters}
            </div>
          )}
        />
        {loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load records.</p>
            <p className="text-xs text-muted-foreground mt-1">
              You may not have access to this module, or the request failed.
            </p>
            <button type="button" onClick={() => remote.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <DataTable<T>
            rows={rows} columns={config.columns}
            selected={sel} onSelect={setSel}
            onRow={r => setViewing(r)}
            actions={r => (
              <div className="flex items-center gap-1">
                {config.rowActions?.(r)}
                <RowActions
                  onView={() => setViewing(r)}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setConfirm(r.id)}
                />
              </div>
            )}
          />
        )}
      </Card>

      {extra}

      {/* Create / Edit */}
      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }}
        size="lg"
        title={editing ? "Edit record" : "Create new"}
        footer={<>
          <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-2 rounded-full text-sm font-semibold border border-border">Cancel</button>
          {steps && !isFirstStep && (
            <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-border inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {steps && !isLastStep ? (
            <button type="button" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button form="resource-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
          )}
        </>}>
        {steps && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {steps.map((s, i) => (
              <button key={s.id} type="button" onClick={() => setStep(i)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${i === step ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-primary"}`}>
                <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] ${i === step ? "bg-primary-foreground/20" : "bg-background"}`}>{i + 1}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <form id="resource-form" onSubmit={async e => {
          e.preventDefault();
          // Read the form before any await: currentTarget is null afterwards.
          const fd = new FormData(e.currentTarget);
          const obj: Record<string, unknown> = { ...((config.defaults as Record<string, unknown>) || {}) };
          config.fields.forEach(f => {
            const raw = String(fd.get(f.name) ?? "");
            if (!JSON_VALUED_TYPES.has(f.type)) { obj[f.name] = raw; return; }
            // Omit rather than send "" or a broken parse — an empty key lets the
            // column keep its default instead of failing validation.
            if (raw === "") return;
            try { obj[f.name] = JSON.parse(raw); } catch { /* omit */ }
          });
          if (editing) {
            await crud.update(editing.id, obj as never);
            config.onUpdate?.({ ...editing, ...(obj as object) } as T);
          } else {
            // Remote creates return undefined when the request failed; the
            // hook has already surfaced the error, so just skip the callback.
            const created = await crud.create(obj as never);
            if (created) config.onCreate?.(created as T);
          }
          setCreating(false); setEditing(null);
        }}>
          <div className="grid grid-cols-2 gap-x-4">
            {config.fields.map(f => {
              const fieldStep = f.step ?? stepIds[0];
              const hidden = steps ? fieldStep !== activeStepId : false;
              const wide = f.fullWidth || f.type === "textarea" || f.type === "image" || f.type === "file" || f.type === "files" || f.type === "list" || f.type === "social" || f.type === "people";
              return (
                <div key={f.name} className={`${wide ? "col-span-2" : ""} ${hidden ? "hidden" : ""}`}>
                  <Field label={f.label}>
                    {f.type === "select" ? (
                      <Select name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? f.options[0]}>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    ) : f.type === "textarea" ? (
                      <textarea name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} rows={3}
                        className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                    ) : f.type === "image" ? (
                      <ImageUploadField name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "file" ? (
                      <FileUploadField name={f.name} required={f.required} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "files" ? (
                      <FilesUploadField name={f.name} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "list" ? (
                      <ListField name={f.name} inputType={f.itemType ?? "text"} placeholder={f.placeholder}
                        defaultValue={(editing as never)?.[f.name]} />
                    ) : f.type === "social" ? (
                      <SocialField name={f.name} defaultValue={(editing as never)?.[f.name]} />
                    ) : f.type === "people" ? (
                      <PeopleField name={f.name} defaultValue={(editing as never)?.[f.name]} roleOptions={f.roleOptions} addLabel={f.addLabel} />
                    ) : (
                      <Input name={f.name} type={f.type} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
        </form>
      </Modal>


      {/* View drawer */}
      <Drawer open={!!viewing} onClose={() => setViewing(null)} title="Details">
        {viewing && (
          <div className="space-y-3 text-sm">
            {Object.entries(viewing).map(([k, v]) => (
              <div key={k} className="border-b border-border/40 pb-2">
                <p className="text-[10px] tracking-widest text-muted-foreground">{k.toUpperCase()}</p>
                <p className="text-primary font-semibold mt-0.5 break-all">
                  {k === "status" ? <Pill tone={statusTone(String(v))}>{String(v)}</Pill> : String(v)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && crud.remove(confirm)}
        title="Delete record" description="This will permanently remove the entry." />
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)} onConfirm={() => { crud.bulkRemove(sel); setSel([]); }}
        title={`Delete ${sel.length} records?`} description="Bulk action cannot be undone." />
    </>
  );
}

