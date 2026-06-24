'use client';
import { useMemo, useRef, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Btn, Pill } from "@/components/admin/ui";
import {
  Plus, Search, Megaphone, Image as ImageIcon, Type, Pencil, Trash2,
  Eye, EyeOff, Calendar, Upload, X, Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Announcement, AnnouncementStatus, AnnouncementType, useAnnouncements,
} from "@/data/announcements";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const imageSrc = (src: Announcement["image"]) => (typeof src === "string" ? src : src?.src ?? "");

type Filter = "All" | AnnouncementStatus;

const emptyForm = (): Announcement => ({
  id: `ann-${Date.now()}`,
  type: "text",
  title: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  status: "Draft",
  updated: new Date().toISOString(),
});

const Page = () => {
  const { items, save, reset } = useAnnouncements();
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [preview, setPreview] = useState<Announcement | null>(null);
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
    published: items.filter(i => i.status === "Published").length,
    drafts: items.filter(i => i.status === "Draft").length,
  }), [items]);

  const upsert = (a: Announcement) => {
    const exists = items.some(x => x.id === a.id);
    save(exists ? items.map(x => (x.id === a.id ? a : x)) : [a, ...items]);
  };

  const togglePublish = (a: Announcement) => {
    const next: AnnouncementStatus = a.status === "Published" ? "Draft" : "Published";
    upsert({ ...a, status: next, updated: new Date().toISOString() });
    toast.success(`Announcement ${next.toLowerCase()}`);
  };

  const remove = (id: string) => {
    save(items.filter(x => x.id !== id));
    toast.success("Announcement removed");
  };

  const onPickFile = (file: File | null) => {
    if (!file || !editing) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    const fr = new FileReader();
    fr.onload = () => setEditing({ ...editing, image: fr.result as string });
    fr.readAsDataURL(file);
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
            <Btn variant="outline" onClick={() => { reset(); toast.success("Demo announcements restored"); }}>
              Reset
            </Btn>
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
            {(["All", "Published", "Draft", "Archived"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === f ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(a => (
            <div key={a.id} className="group rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden flex flex-col">
              {a.type === "image" && a.image ? (
                <div className="aspect-[16/9] w-full bg-muted overflow-hidden">
                  <img src={imageSrc(a.image)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
                  <Pill tone={a.status === "Published" ? "ok" : a.status === "Draft" ? "warn" : "default"}>
                    {a.status}
                  </Pill>
                </div>
                <h3 className="font-display text-lg text-primary leading-tight line-clamp-2">{a.title}</h3>
                <p className="text-sm text-foreground/70 line-clamp-3 flex-1">{a.body}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(a.updated), "MMM d, yyyy · HH:mm")}
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
                      title={a.status === "Published" ? "Unpublish" : "Publish"}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      {a.status === "Published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditing(a)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
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
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing && items.some(i => i.id === editing.id) ? "Edit Announcement" : "New Announcement"}
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
                      <img src={imageSrc(editing.image)} alt="" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, image: undefined })}
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
                    onChange={e => onPickFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CTA Label</Label>
                  <Input
                    value={editing.ctaLabel || ""}
                    onChange={e => setEditing({ ...editing, ctaLabel: e.target.value })}
                    placeholder="View Pricing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CTA Link</Label>
                  <Input
                    value={editing.ctaUrl || ""}
                    onChange={e => setEditing({ ...editing, ctaUrl: e.target.value })}
                    placeholder="/pricing"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Published", "Draft", "Archived"] as AnnouncementStatus[]).map(s => (
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
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn
              onClick={() => {
                if (!editing) return;
                if (!editing.title.trim()) { toast.error("Title is required"); return; }
                if (editing.type === "image" && !editing.image) { toast.error("Please upload an image"); return; }
                upsert({ ...editing, updated: new Date().toISOString() });
                toast.success("Announcement saved");
                setEditing(null);
              }}
            >
              Save Announcement
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
                  <img src={imageSrc(preview.image)} alt={preview.title} className="w-full h-full object-cover" />
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
                {preview.ctaLabel && preview.ctaUrl && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {preview.ctaLabel} <ArrowRight className="h-4 w-4" />
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

