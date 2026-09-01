"use client";

import { useMemo, useRef, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Btn, Pill } from "@/components/admin/ui";
import {
  Plus, Search, Megaphone, Image as ImageIcon, Type, Pencil, Trash2,
  Eye, EyeOff, Calendar, Upload, X, Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Announcement, AnnouncementStatus, AnnouncementType,
} from "@/data/announcements";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type Filter = "All" | AnnouncementStatus;

/**
 * The editor's working copy. No id means "new"; cta fields are plain strings
 * here (the row carries them as string | null) so the inputs stay controlled.
 */
type Draft = {
  id?: string;
  type: AnnouncementType;
  title: string;
  body: string;
  image: string | null;
  cta_label: string;
  cta_url: string;
  status: AnnouncementStatus;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const emptyForm = (): Draft => ({
  type: "text",
  title: "",
  body: "",
  image: null,
  cta_label: "",
  cta_url: "",
  status: "draft",
});

const toDraft = (a: Announcement): Draft => ({
  id: a.id,
  type: a.type,
  title: a.title,
  body: a.body,
  image: a.image,
  cta_label: a.cta_label ?? "",
  cta_url: a.cta_url ?? "",
  status: a.status,
});

const Page = () => {
  const crud = useResourceCrud<Announcement>("announcements");
  const items = crud.items;
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return items.filter(a => {
      const q = query.toLowerCase();
      const mq = a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
      const mf = filter === "All" ? true : a.status === filter;
      return mq && mf;
    });
  }, [items, filter, query]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter(i => i.status === "published").length,
    drafts: items.filter(i => i.status === "draft").length,
  }), [items]);

  const persist = async (draft: Draft) => {
    const payload = {
      type: draft.type,
      title: draft.title.trim(),
      body: draft.body,
      image: draft.type === "image" ? draft.image : null,
      cta_label: draft.cta_label.trim() || null,
      cta_url: draft.cta_url.trim() || null,
      status: draft.status,
    };
    setSaving(true);
    const ok = draft.id
      ? await crud.update(draft.id, payload)
      : Boolean(await crud.create(payload as never));
    setSaving(false);
    if (ok) setEditing(null);
  };

  const togglePublish = (a: Announcement) => {
    const next: AnnouncementStatus = a.status === "published" ? "draft" : "published";
    void crud.update(a.id, { status: next });
  };

  return (
    <SuperLayout title="Announcements" subtitle="Broadcast pop-up announcements to home page visitors">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-card border border-border/60 shadow-soft px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">TOTAL</p>
                <p className="font-display text-xl text-primary leading-none mt-0.5">{stats.total}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border/60 shadow-soft px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/40 text-accent-foreground grid place-items-center">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">LIVE</p>
                <p className="font-display text-xl text-primary leading-none mt-0.5">{stats.published}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border/60 shadow-soft px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-chip text-chip-foreground grid place-items-center">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">DRAFTS</p>
                <p className="font-display text-xl text-primary leading-none mt-0.5">{stats.drafts}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={() => setEditing(emptyForm())}>
              <Plus className="h-4 w-4" /> New Announcement
            </Btn>
          </div>
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-border/60"
            />
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
            {(["All", "published", "draft", "archived"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === f ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {f === "All" ? "All" : cap(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {crud.error ? (
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load announcements.</p>
            <p className="text-xs text-muted-foreground mt-1">
              You may not have access to this module, or the request failed.
            </p>
            <Btn variant="outline" className="mt-3" onClick={() => crud.refetch()}>Try again</Btn>
          </div>
        ) : crud.isLoading ? (
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(a => (
            <div key={a.id} className="group rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden flex flex-col">
              {a.type === "image" && a.image ? (
                <div className="aspect-[16/9] w-full bg-muted overflow-hidden">
                  <img src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              ) : (
                <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/10 via-accent/30 to-chip grid place-items-center">
                  <Sparkles className="h-10 w-10 text-primary/50" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Pill tone={a.type === "image" ? "info" : "default"}>
                    {a.type === "image" ? <ImageIcon className="h-3 w-3 mr-1 inline" /> : <Type className="h-3 w-3 mr-1 inline" />}
                    {a.type}
                  </Pill>
                  <Pill tone={a.status === "published" ? "ok" : a.status === "draft" ? "warn" : "default"}>
                    {cap(a.status)}
                  </Pill>
                </div>
                <h3 className="font-display text-lg text-primary leading-tight line-clamp-2">{a.title}</h3>
                <p className="text-sm text-foreground/70 line-clamp-3 flex-1">{a.body}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(a.updated_at), "MMM d, yyyy · HH:mm")}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <button
                    onClick={() => setPreview(a)}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePublish(a)}
                      title={a.status === "published" ? "Unpublish" : "Publish"}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      {a.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditing(toDraft(a))}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void crud.remove(a.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl bg-card border border-border/60 shadow-soft p-12 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="font-semibold text-primary">No announcements yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click &quot;New Announcement&quot; to broadcast your first message.</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Announcement" : "New Announcement"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <Label className="mb-2 block">Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["text", "image"] as AnnouncementType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditing({ ...editing, type: t })}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        editing.type === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 text-foreground/70 hover:border-primary/50"
                      }`}
                    >
                      {t === "text" ? <Type className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      {t === "text" ? "Text" : "Image"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. 30% Off Annual Plans"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={editing.body}
                  onChange={e => setEditing({ ...editing, body: e.target.value })}
                  placeholder="Describe your announcement…"
                />
              </div>

              {editing.type === "image" && (
                <div className="space-y-1.5">
                  <Label>Image</Label>
                  {editing.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/60">
                      <img src={editing.image} alt="" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, image: null })}
                        className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-card/90 border border-border/60 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 px-4 py-8 text-center transition-colors"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-semibold text-primary">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 2MB</p>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Image must be smaller than 2MB");
                        return;
                      }
                      const fr = new FileReader();
                      fr.onload = () => setEditing(cur => (cur ? { ...cur, image: fr.result as string } : cur));
                      fr.readAsDataURL(file);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTA Label</Label>
                  <Input
                    value={editing.cta_label}
                    onChange={e => setEditing({ ...editing, cta_label: e.target.value })}
                    placeholder="View Pricing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA Link</Label>
                  <Input
                    value={editing.cta_url}
                    onChange={e => setEditing({ ...editing, cta_url: e.target.value })}
                    placeholder="/pricing"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["published", "draft", "archived"] as AnnouncementStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditing({ ...editing, status: s })}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        editing.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 text-foreground/60 hover:border-primary/50"
                      }`}
                    >
                      {cap(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn
              disabled={saving}
              onClick={() => {
                if (!editing) return;
                if (!editing.title.trim()) { toast.error("Title is required"); return; }
                if (editing.type === "image" && !editing.image) { toast.error("Please upload an image"); return; }
                void persist(editing);
              }}
            >
              {saving ? "Saving…" : "Save Announcement"}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog — same look as the live popup */}
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {preview && (
            <>
              {preview.type === "image" && preview.image ? (
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img src={preview.image} alt={preview.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="px-7 pt-8 pb-2 bg-gradient-to-br from-primary/10 via-accent/30 to-chip">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 backdrop-blur text-[10px] font-bold tracking-widest text-primary border border-border/60">
                    <Sparkles className="h-3 w-3" /> ANNOUNCEMENT
                  </span>
                </div>
              )}
              <div className="p-7 space-y-3">
                <h3 className="font-display text-2xl text-primary leading-tight">{preview.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{preview.body}</p>
                {preview.cta_label && preview.cta_url && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {preview.cta_label} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                )}
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground pt-3 border-t border-border/50">
                  PREVIEW · This is how visitors see the pop-up on the home page
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SuperLayout>
  );
};

export default Page;
