'use client';
import { useState } from "react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  defaultPricing,
  loadPricing,
  savePricing,
  type PricingData,
  type PricingPlan,
  type CompareRow,
  type Faq,
} from "@/data/pricing";

const Packages = () => {
  const [data, setData] = useState<PricingData>(() => loadPricing());

  const update = (patch: Partial<PricingData>) => setData(prev => ({ ...prev, ...patch }));
  const updateHero = (patch: Partial<PricingData["hero"]>) =>
    setData(prev => ({ ...prev, hero: { ...prev.hero, ...patch } }));

  const updatePlan = (i: number, patch: Partial<PricingPlan>) =>
    update({ plans: data.plans.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const addPlan = () =>
    update({
      plans: [
        ...data.plans,
        { name: "New Plan", price: "0", tag: "Description", cta: "Get Started", featured: false, features: [{ text: "Feature", on: true }] },
      ],
    });
  const removePlan = (i: number) => update({ plans: data.plans.filter((_, idx) => idx !== i) });

  const updateFeature = (pi: number, fi: number, patch: Partial<{ text: string; on: boolean }>) => {
    const features = data.plans[pi].features.map((f, idx) => (idx === fi ? { ...f, ...patch } : f));
    updatePlan(pi, { features });
  };
  const addFeature = (pi: number) => updatePlan(pi, { features: [...data.plans[pi].features, { text: "New feature", on: true }] });
  const removeFeature = (pi: number, fi: number) =>
    updatePlan(pi, { features: data.plans[pi].features.filter((_, idx) => idx !== fi) });

  const updateRow = (i: number, patch: Partial<CompareRow>) =>
    update({ compareRows: data.compareRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const addRow = () => update({ compareRows: [...data.compareRows, { label: "New spec", basic: "—", pro: "—", enterprise: "—" }] });
  const removeRow = (i: number) => update({ compareRows: data.compareRows.filter((_, idx) => idx !== i) });

  const updateFaq = (i: number, patch: Partial<Faq>) =>
    update({ faqs: data.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const addFaq = () => update({ faqs: [...data.faqs, { q: "New question?", a: "Answer." }] });
  const removeFaq = (i: number) => update({ faqs: data.faqs.filter((_, idx) => idx !== i) });

  const handleSave = () => {
    savePricing(data);
    toast.success("Pricing page updated — changes are live");
  };
  const handleReset = () => {
    setData(defaultPricing);
    savePricing(defaultPricing);
    toast.info("Pricing reset to defaults");
  };

  return (
    <SuperLayout title="Package Management">
      <div className="flex flex-wrap gap-2 justify-end mb-4">
        <Btn variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4" />Reset to default</Btn>
        <Btn onClick={handleSave}><Save className="h-4 w-4" />Save & publish</Btn>
      </div>

      {/* Hero */}
      <Card className="p-6 mb-6">
        <SectionTitle title="Hero section" />
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div>
            <Label>Eyebrow</Label>
            <Input value={data.hero.eyebrow} onChange={e => updateHero({ eyebrow: e.target.value })} />
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
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2">Spec</th>
                <th className="py-2 pr-2">Basic</th>
                <th className="py-2 pr-2">Pro</th>
                <th className="py-2 pr-2">Enterprise</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.compareRows.map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2 pr-2"><Input value={r.label} onChange={e => updateRow(i, { label: e.target.value })} /></td>
                  <td className="py-2 pr-2"><Input value={r.basic} onChange={e => updateRow(i, { basic: e.target.value })} /></td>
                  <td className="py-2 pr-2"><Input value={r.pro} onChange={e => updateRow(i, { pro: e.target.value })} /></td>
                  <td className="py-2 pr-2"><Input value={r.enterprise} onChange={e => updateRow(i, { enterprise: e.target.value })} /></td>
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
export default Packages;
