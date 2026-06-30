import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw, Save, ExternalLink } from "lucide-react";
import { usePricing } from "@/hooks/usePricing";
import { defaultPricing, loadPricing, savePricing } from "@/data/pricing";

const PricingHeroEditor = () => {
  const data = usePricing();
  const [draft, setDraft] = useState(data.hero);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDraft(data.hero);
      setDirty(false);
    }, 0);

    return () => window.clearTimeout(id);
  }, [data.hero]);

  const onSave = () => {
    const current = loadPricing();
    savePricing({ ...current, hero: draft });
    setDirty(false);
    toast.success("Pricing page updated");
  };

  const onReset = () => {
    const current = loadPricing();
    savePricing({ ...current, hero: defaultPricing.hero });
    toast.success("Restored defaults");
  };

  const setField = (key: keyof typeof draft, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  return (
    <Card className="p-5">
      <SectionTitle
        title="Pricing Hero"
        action={
          <div className="flex items-center gap-2">
            <a href="/pricing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Preview
            </a>
            <Btn variant="ghost" onClick={onReset}>
              <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span>
            </Btn>
            <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
              <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span>
            </Btn>
          </div>
        }
      />
      <p className="text-xs text-muted-foreground font-mono mb-3">/pricing</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Eyebrow</Label>
          <Input value={draft.eyebrow} onChange={e => setField("eyebrow", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={draft.title} onChange={e => setField("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Textarea rows={4} value={draft.subtitle} onChange={e => setField("subtitle", e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Manage plans, comparison rows, and FAQs from the Package Management panel.
      </p>
    </Card>
  );
};

export default PricingHeroEditor;
