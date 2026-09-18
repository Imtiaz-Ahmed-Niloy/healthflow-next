"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import PageHeroEditor from "@/components/super/PageHeroEditor";
import { usePageHero } from "@/data/usePageHero";
import type { AboutContent, Pillar, TeamMember, Stat, JourneyStep, CoreObjective } from "@/data/aboutContent";
import { useAboutContent } from "@/data/useAboutContent";

/** Icon names are lucide component names, stored as is — not words to translate. */
const ICONS = ["Leaf","HeartPulse","ShieldCheck","Sparkles","Globe","Stethoscope","Activity","Brain","Users","Heart","Award","Compass","Cpu","TrendingUp","Handshake","Eye","Target","Quote"];

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const t = useTranslations("super.cmsEditor");
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={t("icon")} /></SelectTrigger>
      <SelectContent className="max-h-64">{ICONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
    </Select>
  );
};

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

/** The controls translate; the page copy typed into them is stored as written. */
const AboutPageEditor = () => {
  const t = useTranslations("super.cmsEditor");
  const heroApi = usePageHero("about");

  const { content, save, reset } = useAboutContent();
  const [draft, setDraft] = useState<AboutContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  const upd = (n: AboutContent) => { setDraft(n); setDirty(true); };
  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success(t("about.updated"));
    } catch (cause) {
      toast.error(describeError(cause, t("about.saveFailed")));
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success(t("about.reset"));
    } catch (cause) {
      toast.error(describeError(cause, t("about.resetFailed")));
    }
  };

  const bar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onReset}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> {t("reset")}</span></Btn>
      <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> {t("save")}</span></Btn>
    </div>
  );
  const addBtn = (onClick: () => void) => (
    <Btn variant="outline" onClick={onClick}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />{t("add")}</span></Btn>
  );

  const setPillars = (patch: Partial<AboutContent["pillars"]>) => upd({ ...draft, pillars: { ...draft.pillars, ...patch } });
  const setPillarItem = (i: number, p: Partial<Pillar>) => setPillars({ items: draft.pillars.items.map((it, ix) => ix === i ? { ...it, ...p } : it) });

  const setTeam = (patch: Partial<AboutContent["team"]>) => upd({ ...draft, team: { ...draft.team, ...patch } });
  const setMember = (i: number, p: Partial<TeamMember>) => setTeam({ members: draft.team.members.map((m, ix) => ix === i ? { ...m, ...p } : m) });

  const setStat = (i: number, p: Partial<Stat>) => upd({ ...draft, stats: draft.stats.map((s, ix) => ix === i ? { ...s, ...p } : s) });

  const setJourney = (patch: Partial<AboutContent["journey"]>) => upd({ ...draft, journey: { ...draft.journey, ...patch } });
  const setJourneyStep = (i: number, p: Partial<JourneyStep>) => setJourney({ steps: draft.journey.steps.map((s, ix) => ix === i ? { ...s, ...p } : s) });

  const setCeoMessage = (patch: Partial<AboutContent["ceoMessage"]>) => upd({ ...draft, ceoMessage: { ...draft.ceoMessage, ...patch } });
  const setVision = (patch: Partial<AboutContent["vision"]>) => upd({ ...draft, vision: { ...draft.vision, ...patch } });
  const setMission = (patch: Partial<AboutContent["mission"]>) => upd({ ...draft, mission: { ...draft.mission, ...patch } });

  const setObjectives = (patch: Partial<AboutContent["objectives"]>) => upd({ ...draft, objectives: { ...draft.objectives, ...patch } });
  const setObjective = (i: number, p: Partial<CoreObjective>) => setObjectives({ items: draft.objectives.items.map((o, ix) => ix === i ? { ...o, ...p } : o) });

  return (
    <Tabs defaultValue="hero" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="hero">{t("hero")}</TabsTrigger>
        <TabsTrigger value="vision">{t("about.visionMission")}</TabsTrigger>
        <TabsTrigger value="journey">{t("about.journeyTab")}</TabsTrigger>
        <TabsTrigger value="ceo">{t("about.ceo")}</TabsTrigger>
        <TabsTrigger value="objectives">{t("about.objectives")}</TabsTrigger>
        <TabsTrigger value="pillars">{t("about.pillars")}</TabsTrigger>
        <TabsTrigger value="team">{t("about.team")}</TabsTrigger>
        <TabsTrigger value="stats">{t("about.stats")}</TabsTrigger>
      </TabsList>

      <TabsContent value="hero">
        <PageHeroEditor route="/about" showCtas={false} content={heroApi.content} save={heroApi.save} reset={heroApi.reset} />
      </TabsContent>

      <TabsContent value="vision">
        <Card className="p-5">
          <SectionTitle title={t("about.visionMission")} action={bar} />
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-primary">{t("about.vision")}</h3>
              <div className="space-y-1.5"><Label>{t("about.eyebrow")}</Label><Input value={draft.vision.eyebrow} onChange={e => setVision({ eyebrow: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={draft.vision.title} onChange={e => setVision({ title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("about.statement")}</Label><Textarea rows={3} value={draft.vision.statement} onChange={e => setVision({ statement: e.target.value })} /></div>
            </div>
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-primary">{t("about.mission")}</h3>
              <div className="space-y-1.5"><Label>{t("about.eyebrow")}</Label><Input value={draft.mission.eyebrow} onChange={e => setMission({ eyebrow: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={draft.mission.title} onChange={e => setMission({ title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("about.statement")}</Label><Textarea rows={3} value={draft.mission.statement} onChange={e => setMission({ statement: e.target.value })} /></div>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="journey">
        <Card className="p-5">
          <SectionTitle title={t("about.journey")} action={bar} />
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={draft.journey.title} onChange={e => setJourney({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>{t("subtitle")}</Label><Textarea rows={2} value={draft.journey.subtitle} onChange={e => setJourney({ subtitle: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("about.steps", { count: draft.journey.steps.length })}</h3>
            {addBtn(() => setJourney({ steps: [...draft.journey.steps, { year: "2026", title: "New milestone", desc: "" }] }))}
          </div>
          <div className="space-y-3">
            {draft.journey.steps.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[120px_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>{t("about.year")}</Label><Input value={s.year} onChange={e => setJourneyStep(i, { year: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={s.title} onChange={e => setJourneyStep(i, { title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("description")}</Label><Input value={s.desc} onChange={e => setJourneyStep(i, { desc: e.target.value })} /></div>
                <Btn variant="danger" onClick={() => setJourney({ steps: draft.journey.steps.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="ceo">
        <Card className="p-5">
          <SectionTitle title={t("about.ceo")} action={bar} />
          <div className="space-y-1.5 mb-3"><Label>{t("about.quote")}</Label><Textarea rows={5} value={draft.ceoMessage.quote} onChange={e => setCeoMessage({ quote: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("about.attributionLead")}</Label><Input value={draft.ceoMessage.attributionLead} onChange={e => setCeoMessage({ attributionLead: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("about.attributionName")}</Label><Input value={draft.ceoMessage.attributionName} onChange={e => setCeoMessage({ attributionName: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="objectives">
        <Card className="p-5">
          <SectionTitle title={t("about.objectives")} action={bar} />
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={draft.objectives.title} onChange={e => setObjectives({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>{t("subtitle")}</Label><Textarea rows={2} value={draft.objectives.subtitle} onChange={e => setObjectives({ subtitle: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("about.objectiveCount", { count: draft.objectives.items.length })}</h3>
            {addBtn(() => setObjectives({ items: [...draft.objectives.items, { icon: "Sparkles", title: "New objective", desc: "" }] }))}
          </div>
          <div className="space-y-3">
            {draft.objectives.items.map((o, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>{t("icon")}</Label><IconSelect value={o.icon} onChange={v => setObjective(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={o.title} onChange={e => setObjective(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setObjectives({ items: draft.objectives.items.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>{t("description")}</Label><Textarea rows={2} value={o.desc} onChange={e => setObjective(i, { desc: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="pillars">
        <Card className="p-5">
          <SectionTitle title={t("about.pillars")} action={bar} />
          <div className="space-y-1.5 mb-4"><Label>{t("sectionTitle")}</Label>
            <Input value={draft.pillars.title} onChange={e => setPillars({ title: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("about.pillarCount", { count: draft.pillars.items.length })}</h3>
            {addBtn(() => setPillars({ items: [...draft.pillars.items, { icon: "Sparkles", title: "New pillar", desc: "" }] }))}
          </div>
          <div className="space-y-3">
            {draft.pillars.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>{t("icon")}</Label><IconSelect value={it.icon} onChange={v => setPillarItem(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={it.title} onChange={e => setPillarItem(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setPillars({ items: draft.pillars.items.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>{t("description")}</Label>
                  <Textarea rows={2} value={it.desc} onChange={e => setPillarItem(i, { desc: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="team">
        <Card className="p-5">
          <SectionTitle title={t("about.team")} action={bar} />
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={draft.team.title} onChange={e => setTeam({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>{t("subtitle")}</Label>
            <Textarea rows={2} value={draft.team.subtitle} onChange={e => setTeam({ subtitle: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("about.memberCount", { count: draft.team.members.length })}</h3>
            {addBtn(() => setTeam({ members: [...draft.team.members, { name: "New member", role: "" }] }))}
          </div>
          <div className="space-y-3">
            {draft.team.members.map((m, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>{t("name")}</Label><Input value={m.name} onChange={e => setMember(i, { name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("about.role")}</Label><Input value={m.role} onChange={e => setMember(i, { role: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("about.photoUrl")}</Label><Input value={m.img ?? ""} placeholder="https://…" onChange={e => setMember(i, { img: e.target.value })} /></div>
                <Btn variant="danger" onClick={() => setTeam({ members: draft.team.members.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card className="p-5">
          <SectionTitle title={t("about.stats")} action={bar} />
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("about.statCount", { count: draft.stats.length })}</h3>
            {addBtn(() => upd({ ...draft, stats: [...draft.stats, { value: "0+", label: "New stat" }] }))}
          </div>
          <div className="space-y-3">
            {draft.stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[200px_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>{t("value")}</Label><Input value={s.value} onChange={e => setStat(i, { value: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>{t("label")}</Label><Input value={s.label} onChange={e => setStat(i, { label: e.target.value })} /></div>
                <Btn variant="danger" onClick={() => upd({ ...draft, stats: draft.stats.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
export default AboutPageEditor;
