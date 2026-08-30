"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Share2, FileText, Stethoscope, Pill, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The visit's headline: its diagnosis, or failing that what the patient came in with. */
const headline = (visit: Visit) =>
  visit.diagnosis[0] ?? visit.complaints[0] ?? visit.department ?? "Consultation";

type Filter = "all" | "prescriptions" | "diagnoses";

const MedicalRecords = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ visits: 0, prescriptions: 0, diagnoses: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [openVisit, setOpenVisit] = useState<Visit | null>(null);
  const [medOpen, setMedOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/patient/medical-records");
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setFailed(true);
          toast.error(body?.error?.message || "Couldn't load your records.");
          return;
        }
        setVisits(body.data.visits ?? []);
        setMedicines(body.data.medicines ?? []);
        setCounts(body.data.counts ?? { visits: 0, prescriptions: 0, diagnoses: 0 });
      } catch {
        setFailed(true);
        toast.error("Couldn't reach the server.");
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
    { key: "all", label: "All Visits", count: counts.visits },
    { key: "prescriptions", label: "Prescriptions", count: counts.prescriptions },
    { key: "diagnoses", label: "Diagnoses", count: counts.diagnoses },
  ];

  return (
    <PatientPortalLayout>
      <div className="grid lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CLINICAL / HISTORICAL RECORDS</p>
          <h1 className="font-display text-5xl text-primary mt-2">Medical Records</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Your completed visits, the diagnoses recorded at them, and everything you have been prescribed.
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <p className="font-display text-4xl text-primary">{loading ? "—" : pad(counts.visits)}</p>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">VISITS</p>
          </div>
          <div>
            <p className="font-display text-4xl text-primary">{loading ? "—" : pad(counts.prescriptions)}</p>
            <p className="text-[10px] tracking-widest font-bold text-primary-glow mt-1">PRESCRIPTIONS</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-16 text-center">Loading your records…</p>
      ) : failed ? (
        <p className="text-sm text-destructive py-16 text-center">
          Your records couldn&apos;t be loaded. Reload the page to try again.
        </p>
      ) : visits.length === 0 ? (
        <div className="py-20 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="font-display text-2xl text-primary">No records yet</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Once you have completed a visit, the doctor&apos;s notes, diagnosis and prescription
            will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-8">
            {/* Most recent visit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
              <h2 className="font-display text-2xl text-primary">Most Recent Visit</h2>
              {latest && (
                <div className="mt-5 grid md:grid-cols-2 gap-6">
                  <div>
                    <span className="rounded-full bg-chip text-primary text-[10px] tracking-widest font-bold px-3 py-1">
                      {dateLabel(latest.date).toUpperCase()}
                    </span>
                    <h3 className="font-display text-2xl text-primary mt-3">{headline(latest)}</h3>
                    {latest.advice.length > 0 && (
                      <p className="text-sm text-foreground/70 mt-3">{latest.advice.join(" · ")}</p>
                    )}
                    {latest.blood_pressure && (
                      <p className="text-xs text-muted-foreground mt-3">Blood pressure: {latest.blood_pressure}</p>
                    )}
                  </div>
                  <div className="bg-chip/40 rounded-2xl p-5 flex flex-col">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground text-center">ATTENDING DOCTOR</p>
                    <p className="font-display text-xl text-primary text-center mt-2">{latest.doctor_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground text-center">
                      {latest.doctor_specialty ?? latest.hospital_name ?? ""}
                    </p>
                    <div className="mt-auto pt-6 flex gap-2">
                      <button onClick={() => setOpenVisit(latest)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-dark text-surface-dark-foreground px-4 py-2.5 text-xs font-semibold shadow-glow">
                        <FileText className="h-3.5 w-3.5" /> Full Report
                      </button>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied"); }}
                        className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-primary hover:bg-chip"
                        aria-label="Copy link to this page"
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
                <Activity className="h-3.5 w-3.5" /> ACTIVITY TIMELINE
              </p>
              <div className="mt-5 space-y-5 border-l border-border ml-1.5 pl-5">
                {visits.slice(0, 4).map(v => (
                  <div key={v.id} className="relative">
                    <div className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary-glow bg-card" />
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">
                      {dateLabel(v.date).toUpperCase()}
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
              <h3 className="font-display text-2xl text-primary">Medicine History</h3>
              {medicines.length > 4 && (
                <button onClick={() => setMedOpen(true)} className="text-sm font-semibold text-primary hover:underline">
                  View all {medicines.length} →
                </button>
              )}
            </div>
            {medicines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nothing has been prescribed to you yet.
              </p>
            ) : (
              <div className="mt-5 space-y-2">
                {medicines.slice(0, 4).map((m, i) => (
                  <div key={`${m.visit_id}-${i}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-chip/30">
                    <p className="font-semibold text-primary">{m.name}</p>
                    <p className="text-sm text-foreground/70">{m.dose}</p>
                    <p className="text-xs text-muted-foreground">for {m.reason}</p>
                    <p className="text-xs text-muted-foreground ml-auto">
                      {m.doctor ? `${m.doctor} · ` : ""}{dateLabel(m.date)}
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
              <h2 className="font-display text-2xl text-primary">Visit History</h2>
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
              <p className="text-sm text-muted-foreground py-8 text-center">Nothing matches that filter.</p>
            ) : (
              <div className="mt-5 space-y-2">
                {filtered.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setOpenVisit(v)}
                    className="w-full text-left flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-semibold text-primary">{headline(v)}</p>
                    <p className="text-xs text-muted-foreground">
                      {[v.doctor_name, v.hospital_name].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-sm text-foreground/70 ml-auto">{dateLabel(v.date)}</p>
                  </button>
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

      {/* One visit, in full */}
      <Dialog open={!!openVisit} onOpenChange={o => !o && setOpenVisit(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary">
              <Stethoscope className="h-5 w-5" /> {openVisit ? headline(openVisit) : ""}
            </DialogTitle>
            <DialogDescription>
              {openVisit
                ? [dateLabel(openVisit.date), openVisit.doctor_name, openVisit.hospital_name].filter(Boolean).join(" · ")
                : ""}
            </DialogDescription>
          </DialogHeader>

          {openVisit && (
            <div className="space-y-5 text-sm">
              {openVisit.blood_pressure && (
                <section>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">VITALS</p>
                  <p className="mt-1 text-foreground/80">Blood pressure {openVisit.blood_pressure}</p>
                </section>
              )}

              {([
                ["COMPLAINTS", openVisit.complaints],
                ["EXAMINATION", openVisit.examination],
                ["INVESTIGATION", openVisit.investigation],
                ["DIAGNOSIS", openVisit.diagnosis],
                ["ADVICE", openVisit.advice],
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
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">PRESCRIPTION</p>
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
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground">NOTES</p>
                  <p className="mt-1 text-foreground/80">{openVisit.notes}</p>
                </section>
              )}

              {openVisit.complaints.length === 0 &&
                openVisit.examination.length === 0 &&
                openVisit.investigation.length === 0 &&
                openVisit.diagnosis.length === 0 &&
                openVisit.advice.length === 0 &&
                openVisit.medicines.length === 0 && (
                  <p className="text-muted-foreground">
                    The doctor did not record any notes for this visit.
                  </p>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Every medicine, across every visit */}
      <Dialog open={medOpen} onOpenChange={setMedOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary">
              <Pill className="h-5 w-5" /> Medicine History
            </DialogTitle>
            <DialogDescription>Everything prescribed to you, newest first.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {medicines.map((m, i) => (
              <div key={`${m.visit_id}-all-${i}`} className="px-4 py-3 rounded-xl bg-chip/30">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <p className="font-semibold text-primary">{m.name}</p>
                  <p className="text-sm text-foreground/70">{m.dose}</p>
                  <p className="text-xs text-muted-foreground ml-auto">{dateLabel(m.date)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  for {m.reason}{m.doctor ? ` · ${m.doctor}` : ""}{m.meal ? ` · ${m.meal}` : ""}
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
