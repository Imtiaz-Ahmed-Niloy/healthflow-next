"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Btn, Pill } from "@/components/admin/ui";
import { Pencil, Trash2, Quote, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTestimonials, sampleAvatars, type Testimonial, type TestimonialAudience, type TestimonialText } from "@/data/testimonials";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

type FormState = {
  audience: TestimonialAudience;
  name: string;
  role: string;
  img: string;
  text: string;
  bn: TestimonialText;
};
const noText: TestimonialText = { name: "", role: "", text: "" };
const empty: FormState = { audience: "Patients", name: "", role: "", img: sampleAvatars[0], text: "", bn: noText };

const AUDIENCES: TestimonialAudience[] = ["Patients", "Doctors", "Hospitals"];

/**
 * The audience is stored in English; only its label follows the language.
 * The name, role and quote are kept in both languages: the switch in the
 * dialog picks which is being typed, and one Save stores both.
 */
const TestimonialsManager = () => {
  const t = useTranslations("super.cmsEditor.testimonials");
  const th = useTranslations("super.cmsEditor.home");
  const tc = useTranslations("common");
  const [lang, setLang] = useState<Locale>("en");
  const audienceLabel = (a: TestimonialAudience) =>
    a === "Patients" ? t("audiences.patients") : a === "Doctors" ? t("audiences.doctors") : t("audiences.hospitals");
  const { items, add, update, remove } = useTestimonials();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openNew = () => { setEditing(null); setForm(empty); setLang("en"); setOpen(true); };
  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({ audience: item.audience, name: item.name, role: item.role, img: item.img, text: item.text, bn: item.bn ?? noText });
    setLang("en");
    setOpen(true);
  };
  /** The words in the language being typed. */
  const words: TestimonialText = lang === "bn" ? form.bn : form;
  const setWord = (k: keyof TestimonialText, v: string) =>
    setForm(f => (lang === "bn" ? { ...f, bn: { ...f.bn, [k]: v } } : { ...f, [k]: v }));
  const save = () => {
    if (!form.name.trim() || !form.text.trim()) {
      toast.error(t("required"));
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success(t("updated"));
    } else {
      add(form);
      toast.success(t("added"));
    }
    setOpen(false);
  };
  const del = (item: Testimonial) => {
    remove(item.id);
    toast.success(t("removed", { name: item.name }));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Btn onClick={openNew}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> {t("add")}</span>
        </Btn>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={item.img} alt={item.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-primary truncate">{item.name}</p>
                    <Pill tone={item.audience === "Patients" ? "info" : item.audience === "Doctors" ? "ok" : "warn"}>{audienceLabel(item.audience)}</Pill>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Quote className="h-3 w-3" /> {item.text}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-background text-foreground/70 hover:text-primary" aria-label={tc("edit")}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => del(item)} className="p-2 rounded-lg hover:bg-background text-foreground/70 hover:text-destructive" aria-label={tc("delete")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("editTitle") : t("add")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("audience")}</Label>
                <Select value={form.audience} onValueChange={(v: TestimonialAudience) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map(a => <SelectItem key={a} value={a}>{audienceLabel(a)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("avatar")}</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {sampleAvatars.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, img: src })}
                      className={`h-10 w-10 rounded-full overflow-hidden border-2 transition ${form.img === src ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {form.img && !sampleAvatars.includes(form.img) && (
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary">
                      <img src={form.img} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <label className="h-10 px-3 rounded-full border border-dashed border-border/70 text-xs font-semibold text-foreground/70 hover:text-primary hover:border-primary/60 cursor-pointer inline-flex items-center gap-1.5 transition">
                    <Upload className="h-3.5 w-3.5" /> {t("upload")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error(t("tooBig"));
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => setForm(f => ({ ...f, img: reader.result as string }));
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            {/* Which language's words the three fields below hold. In Bangla
                the English shows as the placeholder: it is what is being put
                into Bangla, and what shows if a field is left empty. */}
            <div className="inline-flex w-fit rounded-full bg-muted/60 p-1" role="group" aria-label={th("language")}>
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
            <div className="space-y-1.5">
              <Label>{t("name")}</Label>
              <Input value={words.name} onChange={e => setWord("name", e.target.value)} placeholder={lang === "bn" ? form.name : "Sarah L."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("role")}</Label>
              <Input value={words.role} onChange={e => setWord("role", e.target.value)} placeholder={lang === "bn" ? form.role : t("rolePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("quote")}</Label>
              <Textarea rows={4} value={words.text} onChange={e => setWord("text", e.target.value)} placeholder={lang === "bn" ? form.text : t("quotePlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setOpen(false)}>{tc("cancel")}</Btn>
            <Btn onClick={save}>{editing ? t("saveChanges") : t("add")}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestimonialsManager;
