"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Building2, Users, ImagePlus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, SectionTitle } from "@/components/admin/ui";
import { RecordFormFields } from "@/components/admin/ResourcePage";
import { HOSPITAL_FIELDS, HOSPITAL_STEPS } from "@/data/hospitalFields";
import type { Tables } from "@/lib/supabase/types";

type Hospital = Tables<"tenants">;

/**
 * The signed-in admin editing their own hospital.
 *
 * This page used to read a localStorage key called "super-hospitals" — the
 * store the super admin's hospital list used before HF-35 made it real. So it
 * was reading a key nothing writes any more, showing "No hospital found" to
 * everyone, and its Save wrote back to that same dead key.
 *
 * Both sides now go through /api/v1/hospital/profile, which reads and writes
 * the caller's own row in `tenants`.
 */
const HospitalProfile = () => {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/hospital/profile");
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setFailed(body?.error?.message || "Could not load your hospital.");
          return;
        }
        setHospital(body.data);
      } catch {
        setFailed("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stepIds = HOSPITAL_STEPS.map(s => s.id);
  const activeStepId = HOSPITAL_STEPS[step]?.id;
  const stepIcons = [Building2, ImagePlus, Users];

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hospital) return;
    const fd = new FormData(e.currentTarget);

    // Only the fields this step actually rendered. Sending every field on
    // every save would blank the sections the admin was not looking at.
    const patch: Record<string, unknown> = {};
    HOSPITAL_FIELDS.forEach(f => {
      if (!fd.has(f.name)) return;
      patch[f.name] = String(fd.get(f.name) ?? "");
    });

    setSaving(true);
    try {
      const res = await fetch("/api/v1/hospital/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Could not save your hospital.");
        return;
      }
      setHospital(body.data);
      toast.success("Hospital profile saved");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Hospital Profile" subtitle="Identity, owners, licenses & contacts">
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading your hospital…</Card>
      </AdminLayout>
    );
  }

  if (failed || !hospital) {
    return (
      <AdminLayout title="Hospital Profile" subtitle="Identity, owners, licenses & contacts">
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {failed ?? "No hospital found. Ask the super admin to register your hospital first."}
          </p>
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
            <button type="submit" form="hospital-profile-form" disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
            </button>
          }
        />
        <form id="hospital-profile-form" onSubmit={onSave}>
          <RecordFormFields
            fields={HOSPITAL_FIELDS}
            editing={hospital as unknown as Record<string, unknown>}
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
              <button type="submit" form="hospital-profile-form" disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60">
                <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </Card>
    </AdminLayout>
  );
};

export default HospitalProfile;
