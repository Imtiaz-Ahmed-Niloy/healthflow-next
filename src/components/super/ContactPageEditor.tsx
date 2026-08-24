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
import type { CmsHeroFields } from "@/data/cmsPageHero";
import { useCmsHero } from "@/data/useCmsHero";
import { useContactContent, type ContactContent, type ContactChannel } from "@/data/cmsContact";

const ICONS = ["Mail","Phone","MessageCircle","MapPin","Globe","Leaf","Headphones","LifeBuoy","Clock","Building2"];

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Icon" /></SelectTrigger>
    <SelectContent className="max-h-64">{ICONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
  </Select>
);

const ContactPageEditor = () => {
  const { content: heroBlob, save: saveHeroBlob, reset: resetHeroBlob } = useCmsHero();
  const heroContent = heroBlob.contact;
  const saveHero = async (next: CmsHeroFields) => { saveHeroBlob({ ...heroBlob, contact: next }); };
  const resetHero = async () => { resetHeroBlob(); };

  const { content, save, reset } = useContactContent();
  const [draft, setDraft] = useState<ContactContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDraft(content); setDirty(false); }, [content]);
  const upd = (n: ContactContent) => { setDraft(n); setDirty(true); };
  const onSave = () => { save(draft); setDirty(false); toast.success("Contact page updated"); };
  const onReset = () => { reset(); toast.success("Contact page reset"); };

  const bar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onReset}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span></Btn>
      <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span></Btn>
    </div>
  );

  const setForm = (patch: Partial<ContactContent["form"]>) => upd({ ...draft, form: { ...draft.form, ...patch } });
  const setSupport = (patch: Partial<ContactContent["support"]>) => upd({ ...draft, support: { ...draft.support, ...patch } });
  const setChannel = (i: number, p: Partial<ContactChannel>) =>
    setSupport({ channels: draft.support.channels.map((c, ix) => ix === i ? { ...c, ...p } : c) });
  const setSanctuary = (patch: Partial<ContactContent["sanctuary"]>) => upd({ ...draft, sanctuary: { ...draft.sanctuary, ...patch } });

  return (
    <Tabs defaultValue="hero" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="hero">Hero</TabsTrigger>
        <TabsTrigger value="form">Contact Form</TabsTrigger>
        <TabsTrigger value="support">Direct Support</TabsTrigger>
        <TabsTrigger value="sanctuary">Our Sanctuary</TabsTrigger>
      </TabsList>

      <TabsContent value="hero">
        <PageHeroEditor route="/contact" showCtas={false} content={heroContent} save={saveHero} reset={resetHero} />
      </TabsContent>

      <TabsContent value="form">
        <Card className="p-5">
          <SectionTitle title="Contact Form" action={bar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Name label</Label><Input value={draft.form.nameLabel} onChange={e => setForm({ nameLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Name placeholder</Label><Input value={draft.form.namePlaceholder} onChange={e => setForm({ namePlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email label</Label><Input value={draft.form.emailLabel} onChange={e => setForm({ emailLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email placeholder</Label><Input value={draft.form.emailPlaceholder} onChange={e => setForm({ emailPlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Subject label</Label><Input value={draft.form.subjectLabel} onChange={e => setForm({ subjectLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Subjects (comma separated)</Label>
              <Input value={draft.form.subjects.join(", ")} onChange={e => setForm({ subjects: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
            <div className="space-y-1.5"><Label>Message label</Label><Input value={draft.form.messageLabel} onChange={e => setForm({ messageLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Message placeholder</Label><Input value={draft.form.messagePlaceholder} onChange={e => setForm({ messagePlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Submit button</Label><Input value={draft.form.submitLabel} onChange={e => setForm({ submitLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Success toast</Label><Input value={draft.form.successMessage} onChange={e => setForm({ successMessage: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="support">
        <Card className="p-5">
          <SectionTitle title="Direct Support" action={bar} />
          <div className="space-y-1.5 mb-4"><Label>Section title</Label>
            <Input value={draft.support.title} onChange={e => setSupport({ title: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">Channels ({draft.support.channels.length})</h3>
            <Btn variant="outline" onClick={() => setSupport({ channels: [...draft.support.channels, { icon: "Mail", title: "New channel", meta: "", value: "", href: "#" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.support.channels.map((c, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>Icon</Label><IconSelect value={c.icon} onChange={v => setChannel(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={c.title} onChange={e => setChannel(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setSupport({ channels: draft.support.channels.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <div className="space-y-1.5"><Label>Meta / hours</Label><Input value={c.meta} onChange={e => setChannel(i, { meta: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Display value</Label><Input value={c.value} onChange={e => setChannel(i, { value: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Link (mailto:/tel:/url)</Label><Input value={c.href} onChange={e => setChannel(i, { href: e.target.value })} /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Helpline button label</Label>
              <Input value={draft.support.helpline.label} onChange={e => setSupport({ helpline: { ...draft.support.helpline, label: e.target.value } })} /></div>
            <div className="space-y-1.5"><Label>Helpline link</Label>
              <Input value={draft.support.helpline.href} onChange={e => setSupport({ helpline: { ...draft.support.helpline, href: e.target.value } })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="sanctuary">
        <Card className="p-5">
          <SectionTitle title="Our Sanctuary" action={bar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Title</Label><Input value={draft.sanctuary.title} onChange={e => setSanctuary({ title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Badge label</Label><Input value={draft.sanctuary.badgeLabel} onChange={e => setSanctuary({ badgeLabel: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Description</Label>
              <Textarea rows={2} value={draft.sanctuary.description} onChange={e => setSanctuary({ description: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Address</Label>
              <Input value={draft.sanctuary.address} onChange={e => setSanctuary({ address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Eco note title</Label>
              <Input value={draft.sanctuary.noteTitle} onChange={e => setSanctuary({ noteTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Eco note description</Label>
              <Textarea rows={2} value={draft.sanctuary.noteDescription} onChange={e => setSanctuary({ noteDescription: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
export default ContactPageEditor;

