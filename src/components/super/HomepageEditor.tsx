"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { HomeContent, HomeText } from "@/data/homeContent";
import { useHomeContent } from "@/data/useHomeContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Save } from "lucide-react";
import TestimonialsManager from "@/components/super/TestimonialsManager";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

/**
 * The homepage hero and stats, in both languages.
 *
 * The switch picks which language's words are being edited; one Save stores
 * both. English is the base — the stat figures are typed there and shared,
 * so the Bangla side edits only each stat's label.
 */
const HomepageEditor = () => {
  const t = useTranslations("super.cmsEditor");
  const { content, save, reset } = useHomeContent();
  const [draft, setDraft] = useState<HomeContent>(content);
  const [dirty, setDirty] = useState(false);
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  /** The hero's words in the language being edited. */
  const text: HomeText = lang === "bn" ? draft.bn : draft;
  const setText = <K extends keyof HomeText>(k: K, v: HomeText[K]) => {
    setDraft(d => (lang === "bn" ? { ...d, bn: { ...d.bn, [k]: v } } : { ...d, [k]: v }));
    setDirty(true);
  };
  const setStat = (i: number, patch: Partial<{ value: string; label: string }>) => {
    setDraft(d => ({ ...d, stats: d.stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
    setDirty(true);
  };
  const setBnStatLabel = (i: number, label: string) => {
    setDraft(d => {
      const statLabels = d.stats.map((_, idx) => d.bn.statLabels[idx] ?? "");
      statLabels[i] = label;
      return { ...d, bn: { ...d.bn, statLabels } };
    });
    setDirty(true);
  };

  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success(t("home.updated"));
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        t("home.saveFailed");
      toast.error(message);
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success(t("restored"));
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        t("home.resetFailed");
      toast.error(message);
    }
  };

  const [tab, setTab] = useState<"hero" | "stats" | "testimonials">("hero");

  return (
    <Card className="p-5 mt-4">
      <SectionTitle
        title={t("home.sections")}
        action={
          tab !== "testimonials" ? (
            <div className="flex items-center gap-2">
              {/* Which language's words the fields below hold. */}
              <div className="inline-flex rounded-full bg-muted/60 p-1" role="group" aria-label={t("home.language")}>
                {LOCALES.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${lang === l ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"}`}
                  >
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>
              <Btn variant="ghost" onClick={onReset}>
                <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> {t("reset")}</span>
              </Btn>
              <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}>
                <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> {t("save")}</span>
              </Btn>
            </div>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="hero">{t("heroSection")}</TabsTrigger>
          <TabsTrigger value="stats">{t("home.stats")}</TabsTrigger>
          <TabsTrigger value="testimonials">{t("home.testimonials")}</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-5 space-y-3">
          <p className="text-xs text-muted-foreground">{t("home.editing", { language: LOCALE_LABELS[lang] })}</p>
          <div className="space-y-1.5">
            <Label>{t("headline")}</Label>
            {/* A textarea, not an input: the hero keeps the line breaks typed
                here, so where the headline wraps is a decision made here. */}
            <Textarea rows={2} value={text.heroTitle1} onChange={e => setText("heroTitle1", e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("home.lineBreaks")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("home.accent")}</Label>
            <Input value={text.heroTitle2} onChange={e => setText("heroTitle2", e.target.value)} placeholder={t("optional")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")}</Label>
            <Textarea rows={4} value={text.heroDesc} onChange={e => setText("heroDesc", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("primaryButton")}</Label>
              <Input value={text.heroBookCta} onChange={e => setText("heroBookCta", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("secondaryButton")}</Label>
              <Input value={text.heroExploreCta} onChange={e => setText("heroExploreCta", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            {lang === "bn" ? t("home.statsBnHint") : t("home.editing", { language: LOCALE_LABELS[lang] })}
          </p>
          {draft.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
              {/* The figure is shared by both languages, so it is typed on the English side. */}
              <Input value={s.value} onChange={e => setStat(i, { value: e.target.value })} placeholder="500+" disabled={lang === "bn"} />
              {lang === "bn" ? (
                <Input value={draft.bn.statLabels[i] ?? ""} onChange={e => setBnStatLabel(i, e.target.value)} placeholder={s.label} />
              ) : (
                <Input value={s.label} onChange={e => setStat(i, { label: e.target.value })} placeholder={t("label")} />
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t("home.liveOnSave")}</p>
        </TabsContent>

        <TabsContent value="testimonials" className="mt-5">
          <TestimonialsManager />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default HomepageEditor;
