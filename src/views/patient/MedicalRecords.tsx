"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Share2, FileText, Stethoscope, Pill, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PrescriptionPreview, type PrescriptionSheetData } from "@/components/common/PrescriptionPreview";
import { useFormatters } from "@/lib/appSettings";
import { PatientDocuments } from "@/components/patient/PatientDocuments";

type Medicine = { name?: string; dosage_form?: string; dose?: string; frequency?: string; days?: string; meal?: string };

type Visit = {
  id: string;
  date: string;
  time: string | null;
  department: string | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  hospital_name: string | null;
  notes: string | null;
  blood_pressure: string | null;
  complaints: string[];
  examination: string[];
  investigation: string[];
  diagnosis: string[];
  advice: string[];
  medicines: Medicine[];
  /** The printed prescription's letterhead and patient details. */
  sheet: {
    hospital: { name: string | null; address: string | null; contact_phone: string | null };
    doctor: { name: string; specialty: string | null; education: string | null; bmdc_number?: string | null };
    patient: {
      full_name: string; gender: string | null; date_of_birth: string | null; mrn: string;
      weight_kg: number | null; height_feet: number | null; height_inches: number | null;
    };
  };
};

type MedicineRow = {
  name: string;
  dose: string;
  meal: string;
  reason: string;
  doctor: string | null;
  date: string;
  visit_id: string;
};

type Counts = { visits: number; prescriptions: number; diagnoses: number };

/** Month names in the page's language; digits stay Western (see appSettings). */
const dateLabel = (iso: string, locale: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", { month: "short", day: "numeric", year: "numeric" });
};

const pad = (n: number) => String(n).padStart(2, "0");

type Filter = "all" | "prescriptions" | "diagnoses";

/**
 * Age on the day of the visit, the way the doctor's sheet printed it:
 * days under two months, months under two years, years after that.
 */
const ageAt = (dob: string | null, on: string) => {
  if (!dob) return null;
  const days = Math.floor((new Date(`${on}T00:00:00`).getTime() - new Date(`${dob}T00:00:00`).getTime()) / 86_400_000);
  if (Number.isNaN(days) || days < 0) return null;
  if (days < 60) return { unit: "days", count: days } as const;
  if (days < 730) return { unit: "months", count: Math.floor(days / 30.44) } as const;
  return { unit: "years", count: Math.floor(days / 365.25) } as const;
};

const MedicalRecords = () => {
  const t = useTranslations("patient.records");
  const tc = useTranslations("common");
  const tr = useTranslations("rxSheet");
  const locale = useLocale();

  /** The visit's headline: its diagnosis, or failing that what the patient came in with. */
  const headline = (visit: Visit) =>
    visit.diagnosis[0] ?? visit.complaints[0] ?? visit.department ?? t("consultation");

  const genderLabel = (g: string | null) =>
    g === "male" || g === "female" || g === "other" ? tr(`gender.${g}`) : g ? g[0].toUpperCase() + g.slice(1) : "—";

  /** A visit, as the sheet PrescriptionPreview prints — the same one the doctor printed. */
  const sheetFor = (v: Visit, formatDate: (d: string) => string): PrescriptionSheetData => {
    const p = v.sheet.patient;
    const age = ageAt(p.date_of_birth, v.date);
    return {
      hospital: v.sheet.hospital,
      doctor: v.sheet.doctor,
      patientBar: [
        [tr("bar.name"), p.full_name || "—"],
        [tr("bar.ageSex"), `${age ? tr(`age.${age.unit}`, { count: age.count }) : "—"} / ${genderLabel(p.gender)}`],
        [tr("bar.patientId"), p.mrn],
        [tr("bar.date"), formatDate(v.date)],
        [tr("bar.weight"), p.weight_kg != null ? tr("kg", { value: p.weight_kg }) : "—"],
        [tr("bar.height"), p.height_feet != null ? tr("height", { feet: p.height_feet, inches: p.height_inches ?? 0 }) : "—"],
        [tr("bar.bp"), v.blood_pressure ?? "—"],
      ],
      complaints: v.complaints,
      examination: v.examination,
      investigation: v.investigation,
      diagnosis: v.diagnosis,
      medicines: v.medicines,
      advice: v.advice,
    };
  };

  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ visits: 0, prescriptions: 0, diagnoses: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [openVisit, setOpenVisit] = useState<Visit | null>(null);
  const [medOpen, setMedOpen] = useState(false);
  // The visit whose printed prescription is open.
  const [rxVisit, setRxVisit] = useState<Visit | null>(null);
  const { formatDate } = useFormatters();

  const openPrescription = (v: Visit) => { setOpenVisit(null); setRxVisit(v); };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/patient/medical-records");
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setFailed(true);
          toast.error(body?.error?.message || t("loadFailed"));
          return;
        }
        setVisits(body.data.visits ?? []);
        setMedicines(body.data.medicines ?? []);
        setCounts(body.data.counts ?? { visits: 0, prescriptions: 0, diagnoses: 0 });
      } catch {
        setFailed(true);
        toast.error(tc("networkError"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const latest = visits[0] ?? null;

  const filtered = useMemo(() => {
    if (filter === "prescriptions") return visits.filter(v => v.medicines.length > 0);
    if (filter === "diagnoses") return visits.filter(v => v.diagnosis.length > 0);
    return visits;
  }, [visits, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t("chips.all"), count: counts.visits },
    { key: "prescriptions", label: t("chips.prescriptions"), count: counts.prescriptions },
    { key: "diagnoses", label: t("chips.diagnoses"), count: counts.diagnoses },
  ];

  return (
    <PatientPortalLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("kicker")}</p>
          <h1 className="font-display text-5xl text-primary mt-2">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <p className="font-display text-4xl text-primary">{loading ? "—" : pad(counts.visits)}</p>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">{t("visits")}</p>
          </div>
          <div>
            <p className="font-display text-4xl text-primary">{loading ? "—" : pad(counts.prescriptions)}</p>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">{t("prescriptions")}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-16 text-center">{t("loading")}</p>
      ) : failed ? (
        <p className="text-sm text-destructive py-16 text-center">{t("failed")}</p>
      ) : visits.length === 0 ? (
        <div className="py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-display text-2xl text-primary">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{t("emptyBody")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-8">
            {/* Most recent visit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
              <h2 className="font-display text-2xl text-primary">{t("recent")}</h2>
              {latest && (
                <div className="mt-5 grid md:grid-cols-2 gap-6">
                  <div>
                    <span className="rounded-full bg-chip text-primary text-[10px] tracking-widest font-bold px-3 py-1">
                      {dateLabel(latest.date, locale).toUpperCase()}
                    </span>
                    <h3 className="font-display text-2xl text-primary mt-3">{headline(latest)}</h3>
                    {latest.advice.length > 0 && (
                      <p className="text-sm text-foreground/70 mt-3">{latest.advice.join(" · ")}</p>
                    )}
                    {latest.blood_pressure && (
                      <p className="text-xs text-muted-foreground mt-3">{t("bp", { value: latest.blood_pressure })}</p>
                    )}
                  </div>
                  <div className="bg-chip/40 rounded-2xl p-5 flex flex-col">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground text-center">{t("attending")}</p>
                    <p className="font-display text-xl text-primary text-center mt-2">{latest.doctor_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground text-center">
                      {latest.doctor_specialty ?? latest.hospital_name ?? ""}
                    </p>
                    <div className="mt-auto pt-6 flex gap-2">
                      <button onClick={() => openPrescription(latest)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2.5 text-xs font-semibold shadow-glow">
                        <FileText className="h-3.5 w-3.5" /> {t("prescription")}
                      </button>
                      <button onClick={() => setOpenVisit(latest)}
                        className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-primary hover:bg-chip">
                        {t("fullReport")}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success(t("linkCopied")); }}
                        className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary hover:bg-chip"
                        aria-label={t("copyLink")}
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Timeline, from the same visits */}
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-3xl bg-chip/40 p-6 border border-border/40">
              <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow">
                <Activity className="h-3.5 w-3.5" /> {t("timeline")}
              </p>
              <div className="mt-5 space-y-5 border-l border-border ml-1.5 pl-5">
                {visits.slice(0, 4).map(v => (
                  <div key={v.id} className="relative">
                    <div className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary-glow bg-card" />
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">
                      {dateLabel(v.date, locale).toUpperCase()}
                    </p>
                    <p className="font-semibold text-primary text-sm mt-0.5">{headline(v)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[v.doctor_name, v.hospital_name].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Medicine history */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-display text-2xl text-primary">{t("medicineHistory")}</h3>
              {medicines.length > 4 && (
                <button onClick={() => setMedOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                  {t("viewAll", { count: medicines.length })}
                </button>
              )}
            </div>
            {medicines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("noMedicines")}</p>
            ) : (
              <div className="mt-5 space-y-2">
                {medicines.slice(0, 4).map((m, i) => (
                  <div key={`${m.visit_id}-${i}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-chip/30">
                    <p className="font-semibold text-primary">{m.name}</p>
                    <p className="text-sm text-foreground/70">{m.dose}</p>
                    <p className="text-xs text-muted-foreground">{t("for", { reason: m.reason })}</p>
                    <p className="text-xs text-muted-foreground ml-auto">
                      {m.doctor ? `${m.doctor} · ` : ""}{dateLabel(m.date, locale)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Visit history */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-2xl text-primary">{t("visitHistory")}</h2>
              <div className="flex gap-2 flex-wrap">
                {chips.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setFilter(c.key)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      filter === c.key ? "bg-primary text-primary-foreground" : "bg-chip text-primary hover:bg-chip/70"
                    }`}
                  >
                    {c.label} {pad(c.count)}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("noMatch")}</p>
            ) : (
              <div className="mt-5 space-y-2">
                {filtered.map(v => (
                  <div key={v.id} className="flex items-center gap-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <button
                      onClick={() => setOpenVisit(v)}
                      className="flex-1 min-w-0 text-left flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3"
                    >
                      <p className="font-semibold text-primary">{headline(v)}</p>
                      <p className="text-xs text-muted-foreground">
                        {[v.doctor_name, v.hospital_name].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-sm text-foreground/70 ml-auto">{dateLabel(v.date, locale)}</p>
                    </button>
                    <button
                      onClick={() => openPrescription(v)}
                      className="mr-2 shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-chip"
                      aria-label={t("prescriptionFrom", { date: dateLabel(v.date, locale) })}
                    >
                      <FileText className="h-3.5 w-3.5" /> {t("prescription")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/*
            A "Vaccination Records" section stood here, listing five invented
            immunisations with batch numbers and the nurses who gave them.
            Nothing in the system records a vaccination — there is no
            immunisation register and no way for anyone to enter one — so it is
            gone rather than left looking real. It needs its own ticket: a
            table, and a screen for whoever administers the dose.
          */}
        </>
      )}

      {/* The patient's own paperwork. Outside the visits branch on purpose:
          someone new to HealthFlow has no visits yet, and is exactly the person
          arriving with a folder of old prescriptions and reports. */}
      {!loading && !failed && <PatientDocuments />}

      {/* One visit, in full */}
      <Dialog open={!!openVisit} onOpenChange={o => !o && setOpenVisit(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary">
              <Stethoscope className="h-5 w-5" /> {openVisit ? headline(openVisit) : ""}
            </DialogTitle>
            <DialogDescription>
              {openVisit
                ? [dateLabel(openVisit.date, locale), openVisit.doctor_name, openVisit.hospital_name].filter(Boolean).join(" · ")
                : ""}
            </DialogDescription>
          </DialogHeader>

          {openVisit && (
            <div className="space-y-5 text-sm">
              <button
                onClick={() => openPrescription(openVisit)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2 text-xs font-semibold shadow-glow"
              >
                <FileText className="h-3.5 w-3.5" /> {t("viewPrescription")}
              </button>
              {openVisit.blood_pressure && (
                <section>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("sections.vitals")}</p>
                  <p className="mt-1 text-foreground/80">{t("bp", { value: openVisit.blood_pressure })}</p>
                </section>
              )}

              {([
                [t("sections.complaints"), openVisit.complaints],
                [t("sections.examination"), openVisit.examination],
                [t("sections.investigation"), openVisit.investigation],
                [t("sections.diagnosis"), openVisit.diagnosis],
                [t("sections.advice"), openVisit.advice],
              ] as const).map(([label, items]) =>
                items.length > 0 ? (
                  <section key={label}>
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{label}</p>
                    <ul className="mt-1 list-disc pl-5 text-foreground/80 space-y-1">
                      {items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </section>
                ) : null,
              )}

              {openVisit.medicines.length > 0 && (
                <section>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("sections.prescription")}</p>
                  <ul className="mt-1 space-y-1 text-foreground/80">
                    {openVisit.medicines.map((m, i) => (
                      <li key={i}>
                        <span className="font-semibold text-primary">{m.name}</span>
                        {[m.dose, m.frequency, m.days, m.meal].filter(Boolean).length > 0 && (
                          <> — {[m.dose, m.frequency, m.days, m.meal].filter(Boolean).join(", ")}</>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {openVisit.notes && (
                <section>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("sections.notes")}</p>
                  <p className="mt-1 text-foreground/80">{openVisit.notes}</p>
                </section>
              )}

              {openVisit.complaints.length === 0 &&
                openVisit.examination.length === 0 &&
                openVisit.investigation.length === 0 &&
                openVisit.diagnosis.length === 0 &&
                openVisit.advice.length === 0 &&
                openVisit.medicines.length === 0 && (
                  <p className="text-muted-foreground">{t("noNotes")}</p>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* The printed prescription — the same sheet the doctor printed. */}
      {rxVisit && (
        <PrescriptionPreview sheet={sheetFor(rxVisit, formatDate)} onClose={() => setRxVisit(null)} />
      )}

      {/* Every medicine, across every visit */}
      <Dialog open={medOpen} onOpenChange={setMedOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary">
              <Pill className="h-5 w-5" /> {t("medicineHistory")}
            </DialogTitle>
            <DialogDescription>{t("medicineHistoryBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {medicines.map((m, i) => (
              <div key={`${m.visit_id}-all-${i}`} className="px-4 py-3 rounded-xl bg-chip/30">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-semibold text-primary">{m.name}</p>
                  <p className="text-sm text-foreground/70">{m.dose}</p>
                  <p className="text-xs text-muted-foreground ml-auto">{dateLabel(m.date, locale)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("for", { reason: m.reason })}{m.doctor ? ` · ${m.doctor}` : ""}{m.meal ? ` · ${m.meal}` : ""}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};

export default MedicalRecords;
