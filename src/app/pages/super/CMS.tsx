'use client';
import { useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn, Pill } from "@/components/admin/ui";
import { FileText, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import HomepageEditor from "@/components/super/HomepageEditor";
import PagesEditor from "@/components/super/PagesEditor";
import FooterEditor from "@/components/super/FooterEditor";
import { useSitePages, type SitePage } from "@/data/sitePages";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const posts = [
  { t: "5 ways AI is reshaping diagnostics", author: "Dr. Imran", status: "published" },
  { t: "Telehealth best practices", author: "Sara K.", status: "draft" },
];

const todayLabel = () => "just now";

const CMS = () => {
  const { pages, save, reset } = useSitePages();
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [query, setQuery] = useState("");

  const upsert = (p: SitePage) => {
    const exists = pages.some(x => x.id === p.id);
    const next = exists ? pages.map(x => (x.id === p.id ? p : x)) : [...pages, p];
    save(next);
  };

  const toggleStatus = (p: SitePage) => {
    upsert({
      ...p,
      status: p.status === "published" ? "draft" : "published",
      updated: todayLabel(),
    });
    toast.success(`${p.title} ${p.status === "published" ? "unpublished" : "published"}`);
  };

  const remove = (p: SitePage) => {
    if (p.builtIn) {
      toast.error("Built-in pages can't be deleted");
      return;
    }
    save(pages.filter(x => x.id !== p.id));
    toast.success("Page removed");
  };

  const onAdd = () => {
    setEditing({
      id: `page-${Date.now()}`,
      title: "Untitled Page",
      slug: "/new-page",
      status: "draft",
      updated: todayLabel(),
    });
  };

  const filtered = pages.filter(
    p =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.slug.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <SuperLayout title="CMS Management" subtitle="Pages, posts & marketing content">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle
            title={`Pages (${pages.length})`}
            action={
              <div className="flex items-center gap-2">
                <Btn variant="ghost" onClick={() => { reset(); toast.success("Pages restored"); }}>
                  Reset
                </Btn>
                <Btn onClick={onAdd}>+ New Page</Btn>
              </div>
            }
          />
          <Input
            placeholder="Search pages by title or slug…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="mb-3"
          />
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map(p => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-primary-glow shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {p.slug} · {p.updated}
                      {p.builtIn ? " · built-in" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(p)}
                    title="Toggle publish status"
                    className="cursor-pointer"
                  >
                    <Pill tone={p.status === "published" ? "ok" : "warn"}>{p.status}</Pill>
                  </button>
                  <a
                    href={p.slug}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setEditing(p)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={p.builtIn}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    title={p.builtIn ? "Built-in pages can't be deleted" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-6">No pages found.</li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Blog Posts" action={<Btn onClick={() => toast.success("New post")}>+ New Post</Btn>} />
          <ul className="space-y-2">
            {posts.map(p => (
              <li key={p.t} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <div>
                  <p className="font-semibold text-primary">{p.t}</p>
                  <p className="text-xs text-muted-foreground">By {p.author}</p>
                </div>
                <Pill tone={p.status === "published" ? "ok" : "warn"}>{p.status}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <HomepageEditor />
      <PagesEditor />
      <FooterEditor />

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && pages.some(p => p.id === editing.id) ? "Edit Page" : "New Page"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug / Path</Label>
                <Input
                  value={editing.slug}
                  onChange={e => setEditing({ ...editing, slug: e.target.value })}
                  disabled={editing.builtIn}
                />
                {editing.builtIn && (
                  <p className="text-xs text-muted-foreground">
                    Route is wired in the app and can't be changed.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <Label htmlFor="pub">Published</Label>
                <Switch
                  id="pub"
                  checked={editing.status === "published"}
                  onCheckedChange={c =>
                    setEditing({ ...editing, status: c ? "published" : "draft" })
                  }
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
