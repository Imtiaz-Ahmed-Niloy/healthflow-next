"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ImageUploadField } from "@/components/admin/ResourcePage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormatters } from "@/lib/appSettings";
import { availabilityLabel } from "@/lib/availability";

/**
 * The doctor's own profile (0077).
 *
 * One person, however many hospitals: what they save here is copied onto
 * every hospital's record of them. What each hospital pays and schedules them
 * is that hospital's, listed underneath and not editable from here.
 */

type DoctorProfile = {
  name: string;
  specialty: string | null;
  education: string | null;
  bio: string | null;
  languages: string | null;
  expertise: string | null;
  experience_years: number | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  gender: string | null;
  bmdc_number: string | null;
};

type Hospital = {
  id: string;
  name: string;
  main: boolean;
  consultation_fee: number | null;
  availability: string | null;
  status: string;
};

const TEXT_FIELDS: { name: keyof DoctorProfile; label: string; placeholder?: string }[] = [
  { name: "name", label: "Full name" },
  { name: "specialty", label: "Specialization", placeholder: "Cardiology" },
  { name: "bmdc_number", label: "BMDC registration no.", placeholder: "A-12345" },
  { name: "education", label: "Education / Qualifications", placeholder: "MBBS, FCPS (Medicine)" },
  { name: "experience_years", label: "Experience (years)" },
  { name: "phone", label: "Phone" },
  { name: "languages", label: "Languages (comma separated)", placeholder: "Bangla, English" },
];

const Profile = () => {
  const { formatCurrency } = useFormatters();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/v1/portal/profile");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error?.message || "Couldn't load your profile.");
        return;
      }
      setProfile(body.data.profile);
      setHospitals(body.data.hospitals ?? []);
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const key of ["name", "specialty", "bmdc_number", "education", "experience_years", "phone", "languages", "gender", "photo_url", "expertise", "bio"]) {
      payload[key] = String(form.get(key) ?? "");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Couldn't save your profile", { description: body?.error?.message });
        return;
      }
      toast.success(hospitals.length > 1 ? `Saved — updated at all ${hospitals.length} hospitals` : "Profile saved");
      void load();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout>
      <div>
        <h1 className="font-display text-4xl text-primary">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your details, shown to patients and to every hospital you work at.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !profile ? (
        <div className="mt-8 rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
          No doctor profile is linked to this login.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-8 items-start">
          <motion.form key={JSON.stringify(profile)} onSubmit={save} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft space-y-5">
            <div className="space-y-1.5">
              <Label>Photo</Label>
              <ImageUploadField name="photo_url" folder="doctors" defaultValue={profile.photo_url ?? ""} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {TEXT_FIELDS.map(f => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input id={f.name} name={f.name} required={f.name === "name"}
                    type={f.name === "experience_years" ? "number" : f.name === "phone" ? "tel" : "text"}
                    min={f.name === "experience_years" ? 0 : undefined}
                    defaultValue={profile[f.name] == null ? "" : String(profile[f.name])}
                    placeholder={f.placeholder} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <select id="gender" name="gender" defaultValue={profile.gender ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email ?? ""} readOnly disabled />
                <p className="text-xs text-muted-foreground">Your sign-in address. It can&apos;t be changed here.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expertise">Areas of expertise (comma separated)</Label>
              <Textarea id="expertise" name="expertise" rows={2} defaultValue={profile.expertise ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">About / Biography</Label>
              <Textarea id="bio" name="bio" rows={5} defaultValue={profile.bio ?? ""} />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <h2 className="font-display text-2xl text-primary">
              {hospitals.length === 1 ? "Your hospital" : hospitals.length === 0 ? "Your hospitals" : `Your ${hospitals.length} hospitals`}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {hospitals.length
                ? "Fees, hours and status are set by each hospital."
                : "You're not at a hospital on HealthFlow yet."}{" "}
              Your own chambers are on <Link href="/portal/chambers" className="font-semibold text-primary hover:underline">My Chambers</Link>.
            </p>
            <div className="mt-5 space-y-3">
              {hospitals.map(h => (
                <div key={h.id} className="rounded-2xl bg-muted/30 border border-border/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-chip flex items-center justify-center text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-primary truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {h.status.replace("_", " ")}{h.main && hospitals.length > 1 ? " · main hospital" : ""}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-muted-foreground">Fee</dt>
                    <dd className="text-right font-semibold text-primary">
                      {h.consultation_fee == null ? "—" : formatCurrency(Number(h.consultation_fee))}
                    </dd>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd className="text-right font-semibold text-primary break-words">{availabilityLabel(h.availability) || "—"}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </PortalLayout>
  );
};

export default Profile;
