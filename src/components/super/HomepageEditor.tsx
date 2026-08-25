"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { HomeContent } from "@/data/homeContent";
import { useHomeContent } from "@/data/useHomeContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Save } from "lucide-react";
import TestimonialsManager from "@/components/super/TestimonialsManager";

const HomepageEditor = () => {
  const { content, save, reset } = useHomeContent();
  const [draft, setDraft] = useState<HomeContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  const set = <K extends keyof HomeContent>(k: K, v: HomeContent[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setDirty(true);
  };
  const setStat = (i: number, patch: Partial<{ value: string; label: string }>) => {
    setDraft(d => ({ ...d, stats: d.stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
    setDirty(true);
  };

  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success("Homepage updated");
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        "Could not save homepage";
      toast.error(message);
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success("Restored defaults");
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        "Could not reset homepage";
      toast.error(message);
    }
  };

  const [tab, setTab] = useState<"hero" | "stats" | "testimonials">("hero");

  return (
    <Card className="p-5 mt-4">
      <SectionTitle
        title="Homepage Sections"
        action={
          tab !== "testimonials" ? (
            <div className="flex items-center gap-2">
              <Btn variant="ghost" onClick={onReset}>
                <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span>
              </Btn>
              <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
                <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span>
              </Btn>
            </div>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="stats">Stats Section</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input value={draft.heroTitle1} onChange={e => set("heroTitle1", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Headline accent (italic)</Label>
            <Input value={draft.heroTitle2} onChange={e => set("heroTitle2", e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={4} value={draft.heroDesc} onChange={e => set("heroDesc", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Primary button</Label>
              <Input value={draft.heroBookCta} onChange={e => set("heroBookCta", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary button</Label>
              <Input value={draft.heroExploreCta} onChange={e => set("heroExploreCta", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-5 space-y-3">
          {draft.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
              <Input value={s.value} onChange={e => setStat(i, { value: e.target.value })} placeholder="500+" />
              <Input value={s.label} onChange={e => setStat(i, { label: e.target.value })} placeholder="Label" />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Edits go live on the homepage as soon as you save.</p>
        </TabsContent>

        <TabsContent value="testimonials" className="mt-5">
          <TestimonialsManager />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default HomepageEditor;

