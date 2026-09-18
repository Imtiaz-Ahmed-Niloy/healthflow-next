"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Btn, Pill } from "@/components/admin/ui";
import {
  FileText, ExternalLink, Pencil, Search,
  Files, CheckCircle2, FileEdit, Lock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { useSitePages, type SitePage } from "@/data/sitePages";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const FILTERS = ["all", "published", "draft"] as const;
type StatusFilter = (typeof FILTERS)[number];

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const formatUpdated = (iso: string, locale: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { day: "numeric", month: "short", year: "numeric" });
};

const StatTile = ({
  icon: Icon, label, value, accent,
}: { icon: typeof Files; label: string; value: number | string; accent: string }) => (
  <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5 flex items-start justify-between">
    <div>
      <p className="text-[11px] tracking-widest font-bold text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-3xl text-primary mt-1.5">{value}</p>
    </div>
    <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent}`}>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

/**
 * Page titles are what the super admin named each page, stored in the
 * database — they show as typed. Everything around them is translated.
 */
const CMS = () => {
  const t = useTranslations("super.cms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { pages, isLoading, isError, setPublished, rename } = useSitePages();
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const openEditor = (page: SitePage) => {
    setEditing(page);
    setDraftTitle(page.title);
  };

  const togglePublished = async (page: SitePage) => {
    const next = !page.published;
    try {
      await setPublished(page, next);
      toast.success(next ? t("publishedToast", { title: page.title }) : t("unpublishedToast", { title: page.title }));
    } catch (cause) {
      toast.error(describeError(cause, next ? t("publishFailed", { title: page.title }) : t("unpublishFailed", { title: page.title })));
    }
  };

  const saveTitle = async () => {
    if (!editing) return;
    const title = draftTitle.trim();
    if (!title) { toast.error(t("needsTitle")); return; }
    try {
      await rename(editing, title);
      toast.success(t("saved"));
      setEditing(null);
    } catch (cause) {
      toast.error(describeError(cause, t("saveFailed")));
    }
  };

  const stats = useMemo(() => ({
    total: pages.length,
    published: pages.filter(p => p.published).length,
    drafts: pages.filter(p => !p.published).length,
    protected: pages.filter(p => p.protected).length,
  }), [pages]);

  const filtered = pages.filter(p => {
    const q = query.toLowerCase();
    const matchQ = p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q);
    const matchF = filter === "all" ? true : filter === "published" ? p.published : !p.published;
    return matchQ && matchF;
  });

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={Files} label={t("stats.total")} value={stats.total} accent="bg-primary/10 text-primary" />
          <StatTile icon={CheckCircle2} label={t("stats.published")} value={stats.published} accent="bg-accent/40 text-accent-foreground" />
          <StatTile icon={FileEdit} label={t("stats.drafts")} value={stats.drafts} accent="bg-chip text-chip-foreground" />
          <StatTile icon={Lock} label={t("alwaysOn")} value={stats.protected} accent="bg-muted text-foreground/70" />
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft">
          <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-border/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-border/60"
              />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === f ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] tracking-widest font-bold text-muted-foreground bg-muted/30 uppercase">
                  <th className="px-6 py-3.5">{t("columns.page")}</th>
                  <th className="px-6 py-3.5 hidden md:table-cell">{t("columns.path")}</th>
                  <th className="px-6 py-3.5">{t("columns.status")}</th>
                  <th className="px-6 py-3.5 hidden lg:table-cell">{t("columns.updated")}</th>
                  <th className="px-6 py-3.5 text-right">{t("columns.actions")}</th>
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
                          {p.protected && (
                            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-0.5 uppercase">{t("alwaysOn")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        {p.path}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublished(p)}
                        disabled={p.protected}
                        title={p.protected ? t("protectedHint") : t("toggleHint")}
                        className="disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pill tone={p.published ? "ok" : "warn"}>{p.published ? t("filters.published") : t("filters.draft")}</Pill>
                      </button>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatUpdated(p.updated_at, locale)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={p.path}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title={t("openNewTab")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => openEditor(p)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title={t("rename")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoading && pages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-muted-foreground">
                      {t("loading")}
                    </td>
                  </tr>
                )}
                {isError && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <AlertTriangle className="h-10 w-10 text-destructive/60 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-primary">{t("loadFailed")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("reload")}</p>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-primary">{t("noneFound")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("tryAnother")}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t.rich("showing", {
                shown: filtered.length,
                total: pages.length,
                b: chunks => <span className="font-bold text-primary">{chunks}</span>,
              })}
            </span>
            <span className="hidden sm:inline">{t("pillHint")}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t("footnote")}</p>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("fields.title")}</Label>
                <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.path")}</Label>
                <Input value={editing.path} disabled />
                <p className="text-xs text-muted-foreground">{t("fields.pathHint")}</p>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <Label htmlFor="pub">{t("fields.published")}</Label>
                <Switch
                  id="pub"
                  checked={editing.published}
                  disabled={editing.protected}
                  onCheckedChange={async c => {
                    await togglePublished(editing);
                    setEditing({ ...editing, published: c });
                  }}
                />
              </div>
              {editing.protected && (
                <p className="text-xs text-muted-foreground">{t("fields.protectedNote")}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{tc("cancel")}</Btn>
            <Btn onClick={saveTitle}>{tc("save")}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperLayout>
  );
};
export default CMS;
