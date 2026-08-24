"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw, Save, ExternalLink } from "lucide-react";
import type { CmsHeroFields } from "@/data/cmsPageHero";

type Props = {
  route: string;
  showCtas?: boolean;
  content: CmsHeroFields;
  save: (next: CmsHeroFields) => Promise<void> | void;
  reset: () => Promise<void> | void;
};

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const PageHeroEditor = ({ route, showCtas = true, content, save, reset }: Props) => {
  const [draft, setDraft] = useState<CmsHeroFields>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  const set = <K extends keyof CmsHeroFields>(k: K, v: CmsHeroFields[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success("Page updated");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save page"));
    }
  };

  const onReset = async () => {
    try {
      await reset();
      toast.success("Restored defaults");
    } catch (cause) {
      toast.error(describeError(cause, "Could not restore defaults"));
    }
  };

  return (
    <Card className="p-5">
      <SectionTitle
        title="Hero Section"
        action={
          <div className="flex items-center gap-2">
            <a
              href={route}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:underline"
            >
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
      <p className="text-xs text-muted-foreground font-mono mb-3">{route}</p>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Eyebrow / Tag</Label>
          <Input value={draft.eyebrow} onChange={e => set("eyebrow", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Headline</Label>
          <Input value={draft.title} onChange={e => set("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={4} value={draft.description} onChange={e => set("description", e.target.value)} />
        </div>
        {showCtas && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Primary button</Label>
              <Input value={draft.primaryCta} onChange={e => set("primaryCta", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary button</Label>
              <Input value={draft.secondaryCta} onChange={e => set("secondaryCta", e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PageHeroEditor;
