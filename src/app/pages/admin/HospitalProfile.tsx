'use client';
import { useState } from "react";
import { toast } from "sonner";
import { Save, Building2, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, SectionTitle } from "@/components/admin/ui";
import { RecordFormFields } from "@/components/admin/ResourcePage";
import { HOSPITAL_FIELDS, HOSPITAL_STEPS } from "@/data/hospitalFields";
import { load, save } from "@/lib/storage";

type Hospital = { id: string; [k: string]: unknown };

const STORE_KEY = "super-hospitals";

const HospitalProfile = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>(() => load<Hospital[]>(STORE_KEY, []));
  const [step, setStep] = useState(0);

  const hospital = hospitals[0] || null;
  const stepIds = HOSPITAL_STEPS.map(s => s.id);
  const activeStepId = HOSPITAL_STEPS[step]?.id;

  const stepIcons = [Building2, Users];

  const onSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hospital) return;
    const fd = new FormData(e.currentTarget);
    const patch: Record<string, unknown> = {};
    HOSPITAL_FIELDS.forEach(f => { patch[f.name] = String(fd.get(f.name) ?? ""); });
    const next = hospitals.map(h => h.id === hospital.id ? { ...h, ...patch } : h);
    setHospitals(next);
    save(STORE_KEY, next);
    toast.success("Hospital profile saved");
  };

  if (!hospital) {
    return (
      <AdminLayout title="Hospital Profile" subtitle="Identity, owners, licenses & contacts">
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No hospital found. Ask the super admin to register your hospital first.</p>
        </Card>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout title="Hospital Profile" subtitle="Update every detail registered for your hospital">
      {/* Step nav */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {HOSPITAL_STEPS.map((s, i) => {
          const Icon = stepIcons[i] || Building2;
          const active = i === step;
          return (
            <button key={s.id} type="button" onClick={() => setStep(i)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted/60 text-muted-foreground hover:text-primary"}`}>
              <Icon className="h-4 w-4" />
              <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background"}`}>{i + 1}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      <Card className="p-6">
        <SectionTitle
          title={HOSPITAL_STEPS[step]?.label || ""}
          action={
            <button type="submit" form="hospital-profile-form"
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">
              <Save className="h-4 w-4 mr-1.5" /> Save changes
            </button>
          }
        />
        <form id="hospital-profile-form" onSubmit={onSave}>
          <RecordFormFields
            fields={HOSPITAL_FIELDS}
            editing={hospital as Record<string, unknown>}
            activeStepId={activeStepId}
            stepIds={stepIds}
          />
          <div className="flex justify-between items-center mt-6 pt-5 border-t border-border/40">
            <button type="button" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-border disabled:opacity-40">Previous</button>
            {step < HOSPITAL_STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => Math.min(HOSPITAL_STEPS.length - 1, s + 1))}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-border">Next section</button>
            ) : (
              <button type="submit" form="hospital-profile-form"
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">
                <Save className="h-4 w-4 mr-1.5" /> Save changes
              </button>
            )}
          </div>
        </form>
      </Card>
    </AdminLayout>
  );
};

export default HospitalProfile;

