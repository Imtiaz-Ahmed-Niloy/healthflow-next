import { useState } from "react";
import { toast } from "sonner";
import { Btn, Pill } from "@/components/admin/ui";
import { Pencil, Trash2, Quote, Plus, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTestimonials, sampleAvatars, type Testimonial, type TestimonialAudience } from "@/data/testimonials";

type FormState = {
  audience: TestimonialAudience;
  name: string;
  role: string;
  img: string;
  text: string;
};
const empty: FormState = { audience: "Patients", name: "", role: "", img: sampleAvatars[0], text: "" };

const TestimonialsManager = () => {
  const { items, add, update, remove } = useTestimonials();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ audience: t.audience, name: t.name, role: t.role, img: t.img, text: t.text });
    setOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || !form.text.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success("Testimonial updated");
    } else {
      add(form);
      toast.success("Testimonial added");
    }
    setOpen(false);
  };
  const del = (t: Testimonial) => {
    remove(t.id);
    toast.success(`Removed ${t.name}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Btn onClick={openNew}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Add Testimonial</span>
        </Btn>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No testimonials yet. Click "Add Testimonial" to create one.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(t => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={typeof (t.img) === "string" ? (t.img) : ((t.img)?.src ?? "")} alt={t.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-primary truncate">{t.name}</p>
                    <Pill tone={t.audience === "Patients" ? "info" : "ok"}>{t.audience}</Pill>
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Quote className="h-3 w-3" /> {t.text}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-background text-foreground/70 hover:text-primary" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => del(t)} className="p-2 rounded-lg hover:bg-background text-foreground/70 hover:text-destructive" aria-label="Delete">
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
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v: TestimonialAudience) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Patients">Patients</SelectItem>
                    <SelectItem value="Doctors">Doctors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Avatar</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {sampleAvatars.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, img: src })}
                      className={`h-10 w-10 rounded-full overflow-hidden border-2 transition ${form.img === src ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={typeof (src) === "string" ? (src) : ((src)?.src ?? "")} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {form.img && !sampleAvatars.includes(form.img) && (
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary">
                      <img src={typeof (form.img) === "string" ? (form.img) : ((form.img)?.src ?? "")} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <label className="h-10 px-3 rounded-full border border-dashed border-border/70 text-xs font-semibold text-foreground/70 hover:text-primary hover:border-primary/60 cursor-pointer inline-flex items-center gap-1.5 transition">
                    <Upload className="h-3.5 w-3.5" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image must be under 2MB");
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
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sarah L." />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Subtitle</Label>
              <Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Member since 2023" />
            </div>
            <div className="space-y-1.5">
              <Label>Quote</Label>
              <Textarea rows={4} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Share what they said..." />
            </div>
          </div>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn onClick={save}>{editing ? "Save Changes" : "Add Testimonial"}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestimonialsManager;
