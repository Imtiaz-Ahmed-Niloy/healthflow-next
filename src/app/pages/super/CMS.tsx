'use client';
import { useMemo, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Btn, Pill } from "@/components/admin/ui";
import {
  FileText, ExternalLink, Pencil, Trash2, Plus, Search,
  Files, CheckCircle2, FileEdit, Lock,
} from "lucide-react";
import { toast } from "sonner";

import { useSitePages, type SitePage } from "@/data/sitePages";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const todayLabel = () => "just now";

type StatusFilter = "all" | "published" | "draft";

const StatTile = ({
  icon: Icon, label, value, accent,
}: { icon: typeof Files; label: string; value: number | string; accent: string }) => (
  <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5 flex items-start justify-between">
    <div>
      <p className="text-[11px] tracking-widest font-bold text-muted-foreground">{label.toUpperCase()}</p>
      <p className="font-display text-3xl text-primary mt-1.5">{value}</p>
    </div>
    <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent}`}>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

const CMS = () => {
  const { pages, save, reset } = useSitePages();
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const upsert = (p: SitePage) => {
    const exists = pages.some(x => x.id === p.id);
    save(exists ? pages.map(x => (x.id === p.id ? p : x)) : [...pages, p]);
  };

  const toggleStatus = (p: SitePage) => {
    upsert({ ...p, status: p.status === "published" ? "draft" : "published", updated: todayLabel() });
    toast.success(`${p.title} ${p.status === "published" ? "unpublished" : "published"}`);
  };

  const remove = (p: SitePage) => {
    if (p.builtIn) { toast.error("Built-in pages can't be deleted"); return; }
    save(pages.filter(x => x.id !== p.id));
    toast.success("Page removed");
  };

  const onAdd = () =>
    setEditing({ id: `page-${Date.now()}`, title: "Untitled Page", slug: "/new-page", status: "draft", updated: todayLabel() });

  const stats = useMemo(() => ({
    total: pages.length,
    published: pages.filter(p => p.status === "published").length,
    drafts: pages.filter(p => p.status === "draft").length,
    builtIn: pages.filter(p => p.builtIn).length,
  }), [pages]);

  const filtered = pages.filter(p => {
    const q = query.toLowerCase();
    const matchQ = p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    const matchF = filter === "all" ? true : p.status === filter;
    return matchQ && matchF;
  });

  return (
    <SuperLayout title="CMS Management" subtitle="Pages, posts & marketing content">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Btn variant="outline" onClick={() => { reset(); toast.success("Pages restored"); }}>
            Reset
          </Btn>
          <Btn onClick={onAdd}>
            <Plus className="h-4 w-4" /> New Page
          </Btn>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={Files} label="Total Pages" value={stats.total} accent="bg-primary/10 text-primary" />
          <StatTile icon={CheckCircle2} label="Published" value={stats.published} accent="bg-accent/40 text-accent-foreground" />
          <StatTile icon={FileEdit} label="Drafts" value={stats.drafts} accent="bg-chip text-chip-foreground" />
          <StatTile icon={Lock} label="Built-in" value={stats.builtIn} accent="bg-muted text-foreground/70" />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft">
          <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-border/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or slug…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-border/60"
              />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
              {(["all", "published", "draft"] as StatusFilter[]).map(f => (
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] tracking-widest font-bold text-muted-foreground bg-muted/30">
                  <th className="px-6 py-3.5">PAGE</th>
                  <th className="px-6 py-3.5 hidden md:table-cell">SLUG</th>
                  <th className="px-6 py-3.5">STATUS</th>
                  <th className="px-6 py-3.5 hidden lg:table-cell">UPDATED</th>
                  <th className="px-6 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(p => (
                  <tr key={p.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-primary truncate">{p.title}</p>
                          {p.builtIn && (
                            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-0.5">BUILT-IN</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {p.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleStatus(p)} title="Toggle publish status">
                        <Pill tone={p.status === "published" ? "ok" : "warn"}>{p.status}</Pill>
                      </button>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-xs text-muted-foreground">
                      {p.updated}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={p.slug}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setEditing(p)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          disabled={p.builtIn}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={p.builtIn ? "Built-in pages can't be deleted" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-primary">No pages found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try a different search or filter.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing <span className="font-bold text-primary">{filtered.length}</span> of {pages.length} pages</span>
            <span className="hidden sm:inline">Click a status pill to toggle publish state</span>
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && pages.some(p => p.id === editing.id) ? "Edit Page" : "New Page"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug / Path</Label>
                <Input
                  value={editing.slug}
                  onChange={e => setEditing({ ...editing, slug: e.target.value })}
                  disabled={editing.builtIn}
                />
                {editing.builtIn && (
                  <p className="text-xs text-muted-foreground">Route is wired in the app and can&apos;t be changed.</p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <Label htmlFor="pub">Published</Label>
                <Switch
                  id="pub"
                  checked={editing.status === "published"}
                  onCheckedChange={c => setEditing({ ...editing, status: c ? "published" : "draft" })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn
              onClick={() => {
                if (!editing) return;
                upsert({ ...editing, updated: todayLabel() });
                toast.success("Page saved");
                setEditing(null);
              }}
            >
              Save
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperLayout>
  );
};
export default CMS;
