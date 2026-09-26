"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ImageUploadField } from "@/components/admin/ResourcePage";
import { SpecialtySelect } from "@/components/common/SpecialtySelect";
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

const TEXT_FIELDS = [
  { name: "name" },
  { name: "bmdc_number", placeholder: "A-12345" },
  { name: "education", placeholder: "MBBS, FCPS (Medicine)" },
  { name: "experience_years" },
  { name: "phone" },
  { name: "languages", placeholder: "Bangla, English" },
] as const satisfies readonly { name: keyof DoctorProfile; placeholder?: string }[];

const Profile = () => {
  const t = useTranslations("portal.doctorProfile");
  const tc = useTranslations("common");
  const locale = useLocale();
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
        toast.error(body?.error?.message || t("loadFailed"));
        return;
      }
      setProfile(body.data.profile);
      setHospitals(body.data.hospitals ?? []);
    } catch {
      toast.error(tc("networkError"));
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
        toast.error(t("saveFailed"), { description: body?.error?.message });
        return;
      }
      toast.success(hospitals.length > 1 ? t("savedEverywhere", { count: hospitals.length }) : t("saved"));
      void load();
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout>
      <div>
        <h1 className="font-display text-4xl text-primary">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !profile ? (
        <div className="mt-8 rounded-2xl bg-card border border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t("noProfile")}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mt-8 items-start">
          <motion.form key={JSON.stringify(profile)} onSubmit={save} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft space-y-5">
            <div className="space-y-1.5">
              <Label>{t("photo")}</Label>
              <ImageUploadField name="photo_url" folder="doctors" defaultValue={profile.photo_url ?? ""} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {TEXT_FIELDS.map(f => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>{t(`fields.${f.name}`)}</Label>
                  <Input id={f.name} name={f.name} required={f.name === "name"}
                    type={f.name === "experience_years" ? "number" : f.name === "phone" ? "tel" : "text"}
                    min={f.name === "experience_years" ? 0 : undefined}
                    defaultValue={profile[f.name] == null ? "" : String(profile[f.name])}
                    placeholder={"placeholder" in f ? f.placeholder : undefined} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>{t("specialization")}</Label>
                {/* From the specialties list (0093) — what patients filter by. */}
                <SpecialtySelect name="specialty" defaultValue={profile.specialty ?? ""}
                  className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-left" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">{t("gender")}</Label>
                <select id="gender" name="gender" defaultValue={profile.gender ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">{t("genders.unset")}</option>
                  <option value="male">{t("genders.male")}</option>
                  <option value="female">{t("genders.female")}</option>
                  <option value="other">{t("genders.other")}</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" value={profile.email ?? ""} readOnly disabled />
                <p className="text-xs text-muted-foreground">{t("emailLocked")}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expertise">{t("expertise")}</Label>
              <Textarea id="expertise" name="expertise" rows={2} defaultValue={profile.expertise ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t("bio")}</Label>
              <Textarea id="bio" name="bio" rows={5} defaultValue={profile.bio ?? ""} />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-6 py-2.5 text-sm font-semibold hover:opacity-90 shadow-glow disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? tc("saving") : t("saveProfile")}
              </button>
            </div>
          </motion.form>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
            <h2 className="font-display text-2xl text-primary">
              {hospitals.length > 1 ? t("yourHospitalsCount", { count: hospitals.length }) : hospitals.length === 1 ? t("yourHospital") : t("yourHospitals")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {hospitals.length ? t("setByHospital") : t("noHospital")}{" "}
              {t.rich("ownChambers", {
                link: chunks => <Link href="/portal/chambers" className="font-semibold text-primary hover:underline">{chunks}</Link>,
              })}
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
                        {h.status.replace("_", " ")}{h.main && hospitals.length > 1 ? ` · ${t("mainHospital")}` : ""}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <dt className="text-muted-foreground">{t("fee")}</dt>
                    <dd className="text-right font-semibold text-primary">
                      {h.consultation_fee == null ? "—" : formatCurrency(Number(h.consultation_fee))}
                    </dd>
                    <dt className="text-muted-foreground">{t("hours")}</dt>
                    <dd className="text-right font-semibold text-primary break-words">{availabilityLabel(h.availability, locale) || "—"}</dd>
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
