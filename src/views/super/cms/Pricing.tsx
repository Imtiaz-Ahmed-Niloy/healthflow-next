"use client";

import { useEffect, useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { PricingContent, PricingPlan, Faq } from "@/data/pricingContent";
import { usePricingContent } from "@/data/usePricingContent";

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const CmsPricing = () => {
  const { content, save, reset } = usePricingContent();
  const [data, setData] = useState<PricingContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setData(content);
  }, [content, dirty]);

  const update = (patch: Partial<PricingContent>) => {
    setData(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const updateHero = (patch: Partial<PricingContent["hero"]>) => {
    setData(prev => ({ ...prev, hero: { ...prev.hero, ...patch } }));
    setDirty(true);
  };

  const updatePlan = (i: number, patch: Partial<PricingPlan>) =>
    update({ plans: data.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const addPlan = () =>
    update({
      plans: [
        ...data.plans,
        { name: "New Plan", price: "0", tag: "Description", cta: "Get Started", featured: false, features: [{ text: "Feature", on: true }] },
      ],
      // Give the new plan a column in every compare row.
      compareRows: data.compareRows.map(r => ({ ...r, values: [...r.values, "—"] })),
    });
  /**
   * `bold` indexes the rendered row, which is `[label, ...values]` — so plan
   * `i` is cell `i + 1`. Dropping a column therefore has to move the emphasis
   * with it: forget an index that pointed at the removed plan, and shift down
   * every index to its right. Without this, removing a plan leaves the bold
   * marks one column off — on seven of the nine rows currently stored, the
   * emphasis is on a cell it was never meant to be on.
   */
  const removePlan = (i: number) =>
    update({
      plans: data.plans.filter((_, idx) => idx !== i),
      compareRows: data.compareRows.map(r => {
        const bold = (r.bold ?? [])
          .filter(n => n !== i + 1)
          .map(n => (n > i + 1 ? n - 1 : n));
        // Set rather than spread-merge: a row whose only bold mark was on the
        // removed plan has to lose the key, not keep the stale one.
        return {
          ...r,
          values: r.values.filter((_, idx) => idx !== i),
          bold: bold.length ? bold : undefined,
        };
      }),
    });

  const updateFeature = (pi: number, fi: number, patch: Partial<{ text: string; on: boolean }>) => {
    const features = data.plans[pi].features.map((f, idx) => (idx === fi ? { ...f, ...patch } : f));
    updatePlan(pi, { features });
  };
  const addFeature = (pi: number) => updatePlan(pi, { features: [...data.plans[pi].features, { text: "New feature", on: true }] });
  const removeFeature = (pi: number, fi: number) =>
    updatePlan(pi, { features: data.plans[pi].features.filter((_, idx) => idx !== fi) });

  const updateRowLabel = (i: number, label: string) =>
    update({ compareRows: data.compareRows.map((r, idx) => (idx === i ? { ...r, label } : r)) });
  const updateCell = (ri: number, ci: number, value: string) =>
    update({
      compareRows: data.compareRows.map((r, idx) =>
        idx === ri ? { ...r, values: r.values.map((v, vIdx) => (vIdx === ci ? value : v)) } : r,
      ),
    });
  const addRow = () =>
    update({ compareRows: [...data.compareRows, { label: "New spec", values: data.plans.map(() => "—") }] });
  const removeRow = (i: number) => update({ compareRows: data.compareRows.filter((_, idx) => idx !== i) });

  const updateFaq = (i: number, patch: Partial<Faq>) =>
    update({ faqs: data.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const addFaq = () => update({ faqs: [...data.faqs, { q: "New question?", a: "Answer." }] });
  const removeFaq = (i: number) => update({ faqs: data.faqs.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    try {
      await save(data);
      setDirty(false);
      toast.success("Pricing page updated — changes are live");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save pricing page"));
    }
  };
  const handleReset = async () => {
    try {
      await reset();
      setDirty(false);
      toast.info("Pricing reset to defaults");
    } catch (cause) {
      toast.error(describeError(cause, "Could not reset pricing page"));
    }
  };

  return (
    <SuperLayout title="Pricing Page" subtitle="Edit content shown on /pricing">
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        <Btn variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4" />Reset to default</Btn>
        <Btn onClick={handleSave}><Save className="h-4 w-4" />Save & publish</Btn>
      </div>

      {/* Hero */}
      <Card className="p-6 mb-6">
        <SectionTitle title="Hero section" />
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div>
          </div>
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input value={data.hero.title} onChange={e => updateHero({ title: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Subtitle</Label>
            <Textarea value={data.hero.subtitle} onChange={e => updateHero({ subtitle: e.target.value })} rows={2} />
          </div>
        </div>
      </Card>

      {/* Plans */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <SectionTitle title="Plans" />
          <Btn onClick={addPlan}><Plus className="h-4 w-4" />Add plan</Btn>
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          {data.plans.map((p, pi) => (
            <Card key={pi} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">PLAN #{pi + 1}</span>
                <button onClick={() => removePlan(pi)} className="text-destructive hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={p.name} onChange={e => updatePlan(pi, { name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Price</Label>
                  <Input value={p.price} onChange={e => updatePlan(pi, { price: e.target.value })} />
                </div>
                <div>
                  <Label>CTA label</Label>
                  <Input value={p.cta} onChange={e => updatePlan(pi, { cta: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Tagline</Label>
                <Input value={p.tag} onChange={e => updatePlan(pi, { tag: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.featured} onCheckedChange={v => updatePlan(pi, { featured: v })} />
                <Label className="m-0">Featured / Most Popular</Label>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Features</Label>
                  <button onClick={() => addFeature(pi)} className="text-xs text-primary hover:underline">+ add</button>
                </div>
                <div className="space-y-2 mt-1">
                  {p.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <Switch checked={f.on} onCheckedChange={v => updateFeature(pi, fi, { on: v })} />
                      <Input value={f.text} onChange={e => updateFeature(pi, fi, { text: e.target.value })} />
                      <button onClick={() => removeFeature(pi, fi)} className="text-destructive hover:opacity-70"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Compare */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <SectionTitle title="Compare table" />
          <Btn onClick={addRow}><Plus className="h-4 w-4" />Add row</Btn>
        </div>
        <p className="text-xs text-muted-foreground mt-1">One column per plan — columns follow the plans above.</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2 min-w-[160px]">Spec</th>
                {data.plans.map((p, pi) => (
                  <th key={pi} className="py-2 pr-2 min-w-[140px]">{p.name || `Plan ${pi + 1}`}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {data.compareRows.map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2 pr-2"><Input value={r.label} onChange={e => updateRowLabel(i, e.target.value)} /></td>
                  {data.plans.map((_, ci) => (
                    <td key={ci} className="py-2 pr-2">
                      <Input value={r.values[ci] ?? ""} onChange={e => updateCell(i, ci, e.target.value)} />
                    </td>
                  ))}
                  <td><button onClick={() => removeRow(i)} className="text-destructive hover:opacity-70"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <SectionTitle title="FAQs" />
          <Btn onClick={addFaq}><Plus className="h-4 w-4" />Add FAQ</Btn>
        </div>
        <div className="space-y-4 mt-4">
          {data.faqs.map((f, i) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">FAQ #{i + 1}</span>
                <button onClick={() => removeFaq(i)} className="text-destructive hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
              </div>
              <Input value={f.q} onChange={e => updateFaq(i, { q: e.target.value })} placeholder="Question" />
              <Textarea value={f.a} onChange={e => updateFaq(i, { a: e.target.value })} rows={2} placeholder="Answer" />
            </Card>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Btn variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4" />Reset</Btn>
        <Btn onClick={handleSave}><Save className="h-4 w-4" />Save & publish</Btn>
      </div>
    </SuperLayout>
  );
};
export default CmsPricing;

