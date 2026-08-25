"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import PageHeroEditor from "@/components/super/PageHeroEditor";
import { usePageHero } from "@/data/usePageHero";
import {
  ICON_OPTIONS,
  type FeaturesContent,
  type ArchFeature,
  type LogicPoint,
  type CoreFeature,
} from "@/data/featuresContent";
import { useFeaturesContent } from "@/data/useFeaturesContent";

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Icon" /></SelectTrigger>
    <SelectContent className="max-h-64">
      {ICON_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
    </SelectContent>
  </Select>
);

const SaveBar = ({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) => (
  <div className="flex items-center gap-2">
    <Btn variant="ghost" onClick={onReset}>
      <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span>
    </Btn>
    <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
      <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span>
    </Btn>
  </div>
);

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const FeaturesPageEditor = () => {
  const heroApi = usePageHero("features");
  const { content, save, reset } = useFeaturesContent();
  const [draft, setDraft] = useState<FeaturesContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  const update = (next: FeaturesContent) => { setDraft(next); setDirty(true); };
  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success("Features page updated");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save features page"));
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success("Features page reset");
    } catch (cause) {
      toast.error(describeError(cause, "Could not reset features page"));
    }
  };

  // Architecture
  const arch = draft.architecture;
  const setArch = (patch: Partial<typeof arch>) => update({ ...draft, architecture: { ...arch, ...patch } });
  const setArchItem = (i: number, patch: Partial<ArchFeature>) =>
    setArch({ items: arch.items.map((it, ix) => ix === i ? { ...it, ...patch } : it) });
  const addArchItem = () => setArch({ items: [...arch.items, { icon: "Sparkles", title: "New Feature", desc: "", bullets: [] }] });
  const delArchItem = (i: number) => setArch({ items: arch.items.filter((_, ix) => ix !== i) });

  // Logic
  const logic = draft.logic;
  const setLogic = (patch: Partial<typeof logic>) => update({ ...draft, logic: { ...logic, ...patch } });
  const setLogicPt = (i: number, patch: Partial<LogicPoint>) =>
    setLogic({ points: logic.points.map((p, ix) => ix === i ? { ...p, ...patch } : p) });
  const addLogicPt = () => setLogic({ points: [...logic.points, { icon: "Sparkles", title: "New Principle", desc: "" }] });
  const delLogicPt = (i: number) => setLogic({ points: logic.points.filter((_, ix) => ix !== i) });

  // Core
  const core = draft.core;
  const setCore = (patch: Partial<typeof core>) => update({ ...draft, core: { ...core, ...patch } });
  const setCoreItem = (i: number, patch: Partial<CoreFeature>) =>
    setCore({ items: core.items.map((it, ix) => ix === i ? { ...it, ...patch } : it) });
  const addCoreItem = () => setCore({ items: [...core.items, { icon: "Sparkles", title: "New Item", desc: "" }] });
  const delCoreItem = (i: number) => setCore({ items: core.items.filter((_, ix) => ix !== i) });

  return (
    <Tabs defaultValue="hero" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="hero">Hero</TabsTrigger>
        <TabsTrigger value="architecture">Intelligent Architecture</TabsTrigger>
        <TabsTrigger value="logic">HealthFlow Logic</TabsTrigger>
        <TabsTrigger value="core">Platform Core</TabsTrigger>
      </TabsList>

      <TabsContent value="hero">
        <PageHeroEditor route="/features" content={heroApi.content} save={heroApi.save} reset={heroApi.reset} />
      </TabsContent>

      <TabsContent value="architecture">
        <Card className="p-5">
          <SectionTitle title="Intelligent Architecture" action={<SaveBar dirty={dirty} onSave={onSave} onReset={onReset} />} />
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5"><Label>Section title</Label>
              <Input value={arch.title} onChange={e => setArch({ title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Tabs (comma separated)</Label>
              <Input value={arch.tabs.join(", ")} onChange={e => setArch({ tabs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
          </div>
          <div className="space-y-1.5 mb-5"><Label>Subtitle</Label>
            <Textarea rows={2} value={arch.subtitle} onChange={e => setArch({ subtitle: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Feature Cards ({arch.items.length})</h3>
            <Btn variant="outline" onClick={addArchItem}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add card</span></Btn>
          </div>
          <div className="space-y-3">
            {arch.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={it.icon} onChange={v => setArchItem(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={it.title} onChange={e => setArchItem(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => delArchItem(i)}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>Description</Label>
                  <Textarea rows={2} value={it.desc} onChange={e => setArchItem(i, { desc: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Bullets (one per line)</Label>
                  <Textarea rows={3} value={it.bullets.join("\n")} onChange={e => setArchItem(i, { bullets: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!it.dark} onCheckedChange={v => setArchItem(i, { dark: v })} />
                  Dark / highlighted card
                </label>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="logic">
        <Card className="p-5">
          <SectionTitle title="HealthFlow Logic" action={<SaveBar dirty={dirty} onSave={onSave} onReset={onReset} />} />
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5"><Label>Title</Label>
              <Input value={logic.title} onChange={e => setLogic({ title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Accent title</Label>
              <Input value={logic.accentTitle} onChange={e => setLogic({ accentTitle: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-3"><Label>Description</Label>
            <Textarea rows={3} value={logic.description} onChange={e => setLogic({ description: e.target.value })} /></div>
          <div className="space-y-1.5 mb-5"><Label>CTA button label</Label>
            <Input value={logic.ctaLabel} onChange={e => setLogic({ ctaLabel: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Logic Points ({logic.points.length})</h3>
            <Btn variant="outline" onClick={addLogicPt}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add point</span></Btn>
          </div>
          <div className="space-y-3">
            {logic.points.map((p, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={p.icon} onChange={v => setLogicPt(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={p.title} onChange={e => setLogicPt(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => delLogicPt(i)}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>Description</Label>
                  <Textarea rows={2} value={p.desc} onChange={e => setLogicPt(i, { desc: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="core">
        <Card className="p-5">
          <SectionTitle title="Platform Core Features" action={<SaveBar dirty={dirty} onSave={onSave} onReset={onReset} />} />
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <div className="space-y-1.5"><Label>Title</Label>
              <Input value={core.title} onChange={e => setCore({ title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Subtitle</Label>
              <Input value={core.subtitle} onChange={e => setCore({ subtitle: e.target.value })} /></div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Core Cards ({core.items.length})</h3>
            <Btn variant="outline" onClick={addCoreItem}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add card</span></Btn>
          </div>
          <div className="space-y-3">
            {core.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={it.icon} onChange={v => setCoreItem(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={it.title} onChange={e => setCoreItem(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => delCoreItem(i)}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>Description</Label>
                  <Textarea rows={2} value={it.desc} onChange={e => setCoreItem(i, { desc: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Chips (comma separated)</Label>
                  <Input value={(it.chips ?? []).join(", ")} onChange={e => setCoreItem(i, { chips: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!it.featured} onCheckedChange={v => setCoreItem(i, { featured: v })} />
                  Featured / highlighted card
                </label>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default FeaturesPageEditor;

