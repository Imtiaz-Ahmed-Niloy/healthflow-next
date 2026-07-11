"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Save } from "lucide-react";
import { usePageContent, type PageKey, type PageFields } from "@/data/pageContent";

const TABS: { key: PageKey; label: string; route: string; metaLabel?: string }[] = [
  { key: "privacy", label: "Privacy", route: "/privacy", metaLabel: "Dates line" },
  { key: "terms", label: "Terms", route: "/terms" },
  { key: "dataUse", label: "Data Use", route: "/data-use" },
  { key: "cookies", label: "Cookies", route: "/cookies", metaLabel: "Footer note" },
  { key: "helpCenter", label: "Help Center", route: "/help-center", metaLabel: "Search placeholder" },
];

const PagesEditor = () => {
  const { content, save, reset } = usePageContent();
  const [draft, setDraft] = useState(content);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<PageKey>("privacy");

  useEffect(() => {
    setDraft(content);
    setDirty(false);
  }, [content]);

  const update = (k: PageKey, patch: Partial<PageFields>) => {
    setDraft(d => ({ ...d, [k]: { ...d[k], ...patch } }));
    setDirty(true);
  };

  const onSave = () => {
    save(draft);
    setDirty(false);
    toast.success("Pages updated");
  };
  const onReset = () => {
    reset();
    toast.success("Restored defaults");
  };

  return (
    <Card className="p-5 mt-4">
      <SectionTitle
        title="Site Pages"
        action={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onReset}>
              <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span>
            </Btn>
            <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
              <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span>
            </Btn>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as PageKey)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          {TABS.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(t => {
          const f = draft[t.key];
          return (
            <TabsContent key={t.key} value={t.key} className="mt-5 space-y-3">
              <p className="text-xs text-muted-foreground font-mono">{t.route}</p>
              <div className="space-y-1.5">
                <Label>Badge / Tag</Label>
                <Input value={f.badge} onChange={e => update(t.key, { badge: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={f.title} onChange={e => update(t.key, { title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={4} value={f.description} onChange={e => update(t.key, { description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.metaLabel ?? "Additional text"}</Label>
                <Textarea rows={2} value={f.meta ?? ""} onChange={e => update(t.key, { meta: e.target.value })} />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
};

export default PagesEditor;

