"use client";

import { useEffect, useState } from "react";
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

const ICONS = ["Leaf","HeartPulse","ShieldCheck","Sparkles","Globe","Stethoscope","Activity","Brain","Users","Heart","Award","Compass","Cpu","TrendingUp","Handshake","Eye","Target","Quote"];

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Icon" /></SelectTrigger>
    <SelectContent className="max-h-64">{ICONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
  </Select>
);

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const AboutPageEditor = () => {
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
      toast.success("About page updated");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save about page"));
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success("About page reset");
    } catch (cause) {
      toast.error(describeError(cause, "Could not reset about page"));
    }
  };

  const bar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onReset}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span></Btn>
      <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span></Btn>
    </div>
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
        <TabsTrigger value="hero">Hero</TabsTrigger>
        <TabsTrigger value="vision">Vision & Mission</TabsTrigger>
        <TabsTrigger value="journey">Journey</TabsTrigger>
        <TabsTrigger value="ceo">CEO Message</TabsTrigger>
        <TabsTrigger value="objectives">Core Objectives</TabsTrigger>
        <TabsTrigger value="pillars">Foundational Pillars</TabsTrigger>
        <TabsTrigger value="team">Visionaries</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>

      <TabsContent value="hero">
        <PageHeroEditor route="/about" showCtas={false} content={heroApi.content} save={heroApi.save} reset={heroApi.reset} />
      </TabsContent>

      <TabsContent value="vision">
        <Card className="p-5">
          <SectionTitle title="Vision & Mission" action={bar} />
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-primary">Vision</h3>
              <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={draft.vision.eyebrow} onChange={e => setVision({ eyebrow: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Title</Label><Input value={draft.vision.title} onChange={e => setVision({ title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Statement</Label><Textarea rows={3} value={draft.vision.statement} onChange={e => setVision({ statement: e.target.value })} /></div>
            </div>
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-primary">Mission</h3>
              <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={draft.mission.eyebrow} onChange={e => setMission({ eyebrow: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Title</Label><Input value={draft.mission.title} onChange={e => setMission({ title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Statement</Label><Textarea rows={3} value={draft.mission.statement} onChange={e => setMission({ statement: e.target.value })} /></div>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="journey">
        <Card className="p-5">
          <SectionTitle title="HealthFlow Journey" action={bar} />
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={draft.journey.eyebrow} onChange={e => setJourney({ eyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={draft.journey.title} onChange={e => setJourney({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>Subtitle</Label><Textarea rows={2} value={draft.journey.subtitle} onChange={e => setJourney({ subtitle: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Timeline Steps ({draft.journey.steps.length})</h3>
            <Btn variant="outline" onClick={() => setJourney({ steps: [...draft.journey.steps, { year: "2026", title: "New milestone", desc: "" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.journey.steps.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[120px_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>Year</Label><Input value={s.year} onChange={e => setJourneyStep(i, { year: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Title</Label><Input value={s.title} onChange={e => setJourneyStep(i, { title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Description</Label><Input value={s.desc} onChange={e => setJourneyStep(i, { desc: e.target.value })} /></div>
                <Btn variant="danger" onClick={() => setJourney({ steps: draft.journey.steps.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="ceo">
        <Card className="p-5">
          <SectionTitle title="CEO Message" action={bar} />
          <div className="space-y-1.5 mb-3"><Label>Eyebrow</Label><Input value={draft.ceoMessage.eyebrow} onChange={e => setCeoMessage({ eyebrow: e.target.value })} /></div>
          <div className="space-y-1.5 mb-3"><Label>Quote</Label><Textarea rows={5} value={draft.ceoMessage.quote} onChange={e => setCeoMessage({ quote: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={draft.ceoMessage.name} onChange={e => setCeoMessage({ name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Role</Label><Input value={draft.ceoMessage.role} onChange={e => setCeoMessage({ role: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="objectives">
        <Card className="p-5">
          <SectionTitle title="Core Objectives" action={bar} />
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={draft.objectives.eyebrow} onChange={e => setObjectives({ eyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={draft.objectives.title} onChange={e => setObjectives({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>Subtitle</Label><Textarea rows={2} value={draft.objectives.subtitle} onChange={e => setObjectives({ subtitle: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Objectives ({draft.objectives.items.length})</h3>
            <Btn variant="outline" onClick={() => setObjectives({ items: [...draft.objectives.items, { icon: "Sparkles", title: "New objective", desc: "" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.objectives.items.map((o, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={o.icon} onChange={v => setObjective(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={o.title} onChange={e => setObjective(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setObjectives({ items: draft.objectives.items.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={o.desc} onChange={e => setObjective(i, { desc: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="pillars">
        <Card className="p-5">
          <SectionTitle title="Foundational Pillars" action={bar} />
          <div className="space-y-1.5 mb-4"><Label>Section title</Label>
            <Input value={draft.pillars.title} onChange={e => setPillars({ title: e.target.value })} /></div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Pillars ({draft.pillars.items.length})</h3>
            <Btn variant="outline" onClick={() => setPillars({ items: [...draft.pillars.items, { icon: "Sparkles", title: "New pillar", desc: "" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.pillars.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={it.icon} onChange={v => setPillarItem(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={it.title} onChange={e => setPillarItem(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setPillars({ items: draft.pillars.items.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="space-y-1.5"><Label>Description</Label>
                  <Textarea rows={2} value={it.desc} onChange={e => setPillarItem(i, { desc: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="team">
        <Card className="p-5">
          <SectionTitle title="Visionaries" action={bar} />
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5"><Label>Eyebrow</Label><Input value={draft.team.eyebrow} onChange={e => setTeam({ eyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={draft.team.title} onChange={e => setTeam({ title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5 mb-4"><Label>Subtitle</Label>
            <Textarea rows={2} value={draft.team.subtitle} onChange={e => setTeam({ subtitle: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Members ({draft.team.members.length})</h3>
            <Btn variant="outline" onClick={() => setTeam({ members: [...draft.team.members, { name: "New member", role: "" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.team.members.map((m, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>Name</Label><Input value={m.name} onChange={e => setMember(i, { name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Role</Label><Input value={m.role} onChange={e => setMember(i, { role: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Photo URL (optional)</Label><Input value={m.img ?? ""} placeholder="https://…" onChange={e => setMember(i, { img: e.target.value })} /></div>
                <Btn variant="danger" onClick={() => setTeam({ members: draft.team.members.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card className="p-5">
          <SectionTitle title="Stats" action={bar} />
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Stat tiles ({draft.stats.length})</h3>
            <Btn variant="outline" onClick={() => upd({ ...draft, stats: [...draft.stats, { value: "0+", label: "New stat" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 grid md:grid-cols-[200px_1fr_auto] gap-2 items-end">
                <div className="space-y-1.5"><Label>Value</Label><Input value={s.value} onChange={e => setStat(i, { value: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Label</Label><Input value={s.label} onChange={e => setStat(i, { label: e.target.value })} /></div>
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

