import { ReactNode, useState, useMemo, useRef } from "react";
import { Upload, X, Plus, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe } from "lucide-react";
import { Card, Pill } from "./ui";
import { DataTable, Toolbar, Modal, ConfirmDialog, RowActions, Drawer, exportCSV, useCrud, Field, Input, Select, Chips, statusTone, type Column } from "./crud";

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
        {preview ? <img src={typeof (preview) === "string" ? (preview) : ((preview)?.src ?? "")} alt="preview" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
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

export type FieldDef =
  | { name: string; label: string; type: "text" | "email" | "tel" | "number" | "date"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "textarea"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "image"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "list"; itemType?: "text" | "email" | "tel" | "url"; placeholder?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "social"; required?: boolean; fullWidth?: boolean };

export type ResourceConfig<T extends { id: string; status?: string }> = {
  storeKey: string;
  seed: T[];
  searchFields: (keyof T)[];
  columns: Column<T>[];
  fields: FieldDef[];
  statuses?: string[];
  exportName?: string;
  addLabel?: string;
  defaults?: Partial<T>;
  onCreate?: (record: T) => void;
  onUpdate?: (record: T) => void;
};

export function ResourcePage<T extends { id: string; status?: string }>({ config, extra }: { config: ResourceConfig<T>; extra?: ReactNode }) {
  const crud = useCrud<T>(config.storeKey, config.seed);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sel, setSel] = useState<string[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);

  const rows = useMemo(() => crud.items.filter(i => {
    const inSearch = !q || config.searchFields.some(f => String((i as never)[f] ?? "").toLowerCase().includes(q.toLowerCase()));
    const inStatus = status === "all" || (i.status || "").toLowerCase() === status.toLowerCase();
    return inSearch && inStatus;
  }), [crud.items, q, status, config.searchFields]);

  return (
    <>
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setCreating(true)} addLabel={config.addLabel || "New"}
          onExport={() => exportCSV(rows as never, `${config.exportName || config.storeKey}.csv`)}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={config.statuses && (
            <Chips value={status as never} onChange={setStatus as never}
              options={[{ value: "all", label: "All" }, ...config.statuses.map(s => ({ value: s, label: s }))]} />
          )}
        />
        <DataTable<T>
          rows={rows} columns={config.columns}
          selected={sel} onSelect={setSel}
          onRow={r => setViewing(r)}
          actions={r => (
            <RowActions
              onView={() => setViewing(r)}
              onEdit={() => setEditing(r)}
              onDelete={() => setConfirm(r.id)}
            />
          )}
        />
      </Card>

      {extra}

      {/* Create / Edit */}
      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }}
        size="lg"
        title={editing ? "Edit record" : "Create new"}
        footer={<>
          <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-2 rounded-full text-sm font-semibold border border-border">Cancel</button>
          <button form="resource-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
        </>}>
        <form id="resource-form" onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const obj: Record<string, unknown> = { ...((config.defaults as Record<string, unknown>) || {}) };
          config.fields.forEach(f => { obj[f.name] = String(fd.get(f.name) ?? ""); });
          if (editing) {
            crud.update(editing.id, obj as never);
            config.onUpdate?.({ ...editing, ...(obj as object) } as T);
          } else {
            const created = crud.create(obj as never);
            config.onCreate?.(created);
          }
          setCreating(false); setEditing(null);
        }}>
          <div className="grid grid-cols-2 gap-x-4">
            {config.fields.map(f => (
              <div key={f.name} className={f.fullWidth || f.type === "textarea" || f.type === "image" || f.type === "list" || f.type === "social" ? "col-span-2" : ""}>
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
                  ) : f.type === "list" ? (
                    <ListField name={f.name} inputType={f.itemType ?? "text"} placeholder={f.placeholder}
                      defaultValue={(editing as never)?.[f.name]} />
                  ) : f.type === "social" ? (
                    <SocialField name={f.name} defaultValue={(editing as never)?.[f.name]} />
                  ) : (
                    <Input name={f.name} type={f.type} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} />
                  )}
                </Field>
              </div>
            ))}
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
