"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import PageHeroEditor from "@/components/super/PageHeroEditor";
import { usePageHero } from "@/data/usePageHero";
import type { ContactContent, ContactChannel } from "@/data/contactContent";
import { useContactContent } from "@/data/useContactContent";

/** Icon names are lucide component names, stored as is — not words to translate. */
const ICONS = ["Mail","Phone","MessageCircle","MapPin","Globe","Leaf","Headphones","LifeBuoy","Clock","Building2"];

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

const ContactPageEditor = () => {
  const t = useTranslations("super.cmsEditor");
  const heroApi = usePageHero("contact");

  const { content, save, reset } = useContactContent();
  const [draft, setDraft] = useState<ContactContent>(content);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setDraft(content);
  }, [content, dirty]);

  const upd = (n: ContactContent) => { setDraft(n); setDirty(true); };
  const onSave = async () => {
    try {
      await save(draft);
      setDirty(false);
      toast.success(t("contact.updated"));
    } catch (cause) {
      toast.error(describeError(cause, t("contact.saveFailed")));
    }
  };
  const onReset = async () => {
    try {
      await reset();
      toast.success(t("contact.reset"));
    } catch (cause) {
      toast.error(describeError(cause, t("contact.resetFailed")));
    }
  };

  const bar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onReset}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> {t("reset")}</span></Btn>
      <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> {t("save")}</span></Btn>
    </div>
  );

  const setForm = (patch: Partial<ContactContent["form"]>) => upd({ ...draft, form: { ...draft.form, ...patch } });
  const setSupport = (patch: Partial<ContactContent["support"]>) => upd({ ...draft, support: { ...draft.support, ...patch } });
  const setChannel = (i: number, p: Partial<ContactChannel>) =>
    setSupport({ channels: draft.support.channels.map((c, ix) => ix === i ? { ...c, ...p } : c) });

  return (
    <Tabs defaultValue="hero" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="hero">{t("hero")}</TabsTrigger>
        <TabsTrigger value="form">{t("contact.form")}</TabsTrigger>
        <TabsTrigger value="support">{t("contact.support")}</TabsTrigger>
      </TabsList>

      <TabsContent value="hero">
        <PageHeroEditor route="/contact" showCtas={false} content={heroApi.content} save={heroApi.save} reset={heroApi.reset} />
      </TabsContent>

      <TabsContent value="form">
        <Card className="p-5">
          <SectionTitle title={t("contact.form")} action={bar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("contact.nameLabel")}</Label><Input value={draft.form.nameLabel} onChange={e => setForm({ nameLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.namePlaceholder")}</Label><Input value={draft.form.namePlaceholder} onChange={e => setForm({ namePlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.emailLabel")}</Label><Input value={draft.form.emailLabel} onChange={e => setForm({ emailLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.emailPlaceholder")}</Label><Input value={draft.form.emailPlaceholder} onChange={e => setForm({ emailPlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.subjectLabel")}</Label><Input value={draft.form.subjectLabel} onChange={e => setForm({ subjectLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.subjects")}</Label>
              <Input value={draft.form.subjects.join(", ")} onChange={e => setForm({ subjects: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.messageLabel")}</Label><Input value={draft.form.messageLabel} onChange={e => setForm({ messageLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.messagePlaceholder")}</Label><Input value={draft.form.messagePlaceholder} onChange={e => setForm({ messagePlaceholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.submit")}</Label><Input value={draft.form.submitLabel} onChange={e => setForm({ submitLabel: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.success")}</Label><Input value={draft.form.successMessage} onChange={e => setForm({ successMessage: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="support">
        <Card className="p-5">
          <SectionTitle title={t("contact.support")} action={bar} />
          <div className="space-y-1.5 mb-4"><Label>{t("sectionTitle")}</Label>
            <Input value={draft.support.title} onChange={e => setSupport({ title: e.target.value })} /></div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-primary">{t("contact.channels", { count: draft.support.channels.length })}</h3>
            <Btn variant="outline" onClick={() => setSupport({ channels: [...draft.support.channels, { icon: "Mail", title: "New channel", meta: "", value: "", href: "#" }] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />{t("add")}</span></Btn>
          </div>
          <div className="space-y-3">
            {draft.support.channels.map((c, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="grid md:grid-cols-[160px_1fr_auto] gap-2 items-end">
                  <div className="space-y-1.5"><Label>{t("icon")}</Label><IconSelect value={c.icon} onChange={v => setChannel(i, { icon: v })} /></div>
                  <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={c.title} onChange={e => setChannel(i, { title: e.target.value })} /></div>
                  <Btn variant="danger" onClick={() => setSupport({ channels: draft.support.channels.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <div className="space-y-1.5"><Label>{t("contact.meta")}</Label><Input value={c.meta} onChange={e => setChannel(i, { meta: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("contact.displayValue")}</Label><Input value={c.value} onChange={e => setChannel(i, { value: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{t("contact.link")}</Label><Input value={c.href} onChange={e => setChannel(i, { href: e.target.value })} /></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("contact.helplineLabel")}</Label>
              <Input value={draft.support.helpline.label} onChange={e => setSupport({ helpline: { ...draft.support.helpline, label: e.target.value } })} /></div>
            <div className="space-y-1.5"><Label>{t("contact.helplineLink")}</Label>
              <Input value={draft.support.helpline.href} onChange={e => setSupport({ helpline: { ...draft.support.helpline, href: e.target.value } })} /></div>
          </div>
        </Card>
      </TabsContent>

    </Tabs>
  );
};
export default ContactPageEditor;
