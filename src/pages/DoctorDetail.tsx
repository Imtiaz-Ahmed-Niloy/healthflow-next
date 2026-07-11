"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Calendar, Languages, GraduationCap, Award, Heart, Mail, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { getAllHospitals, readAdminDoctors, mapAdminDoctor } from "@/hooks/useHospitals";
import type { Hospital, Doctor } from "@/data/hospitals";
import { slugify } from "@/lib/slug";

const buildAllDoctors = () => {
  const seen = new Set<string>();
  const out: { d: Doctor & { slug: string }; hospital: Hospital }[] = [];
  const all = getAllHospitals();
  for (const h of all) {
    for (const d of h.doctors_list) {
      const slug = slugify(d.name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ d: { ...d, slug }, hospital: h });
    }
  }
  // Fallback: include admin-registered doctors whose hospital field
  // doesn't match any hospital — attach them to a best-guess or first hospital.
  for (const ad of readAdminDoctors()) {
    const slug = slugify(ad.name);
    if (seen.has(slug)) continue;
    seen.add(slug);
    const target = (ad.hospital || "").toLowerCase().trim();
    const hospital =
      all.find((h) => h.name.toLowerCase().trim() === target) ||
      all.find((h) => slugify(h.name) === slugify(ad.hospital || "")) ||
      all[0];
    if (!hospital) continue;
    out.push({ d: { ...mapAdminDoctor(ad), slug }, hospital });
  }
  return out;
};

const DoctorDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const allDoctors = buildAllDoctors();
  const found = allDoctors.find((x) => x.d.slug === (slug ?? ""));

  if (!found) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <main className="container mx-auto py-32 text-center">
          <h1 className="font-display text-4xl text-primary">Doctor not found</h1>
          <Link href="/hospitals" className="mt-6 inline-flex items-center gap-2 text-primary"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const { d, hospital } = found;
  const peers = allDoctors.filter((x) => x.d.slug !== d.slug && x.d.specialty === d.specialty).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-12">
        <Link href="/hospitals" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Hospitals
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-[360px_1fr] gap-8">
          <div className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-card sticky top-24 self-start">
            <div className="relative aspect-[4/5] bg-gradient-to-br from-accent/40 to-primary/10">
              <img src={d.photo} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-3 py-1 text-xs font-semibold text-primary">
                <Star className="h-3 w-3 fill-accent text-accent" />{d.rating}
              </span>
            </div>
            <div className="p-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary-glow">{d.specialty}</span>
              <h1 className="font-display text-3xl text-primary mt-2">{d.name}</h1>
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-2"><GraduationCap className="h-3 w-3" />{d.education}</p>
              <Link href="/patient/find-doctors" className="mt-5 block text-center w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                Book Appointment
              </Link>
              <button onClick={() => toast.success(`${d.name} saved to favorites`)} className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
                <Heart className="h-4 w-4" /> Save
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: "Experience", v: `${d.experience}+ yrs`, i: Award },
                { l: "Patients", v: `${(d.patients / 1000).toFixed(1)}k`, i: Heart },
                { l: "Rating", v: d.rating, i: Star },
                { l: "Fee", v: `$${d.fee}`, i: CheckCircle2 },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-card border border-border/60 p-4 text-center">
                  <s.i className="h-5 w-5 text-primary-glow mx-auto" />
                  <p className="font-display text-2xl text-primary mt-2">{s.v}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{s.l}</p>
                </div>
              ))}
            </div>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary">About Dr. {d.name.split(" ").slice(-1)[0]}</h2>
              <p className="text-foreground/75 leading-relaxed mt-3">
                {d.name} is a board-certified {d.specialty.toLowerCase()} specialist with {d.experience}+ years of experience treating over {d.patients.toLocaleString()} patients. Practicing at {hospital.name}, {d.name.split(" ")[0]} blends evidence-based medicine with a deeply human, patient-first approach to care.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
                <div className="flex items-center gap-2 text-foreground/70"><Languages className="h-4 w-4 text-primary-glow" />{d.languages.join(" · ")}</div>
                <div className="flex items-center gap-2 text-foreground/70"><Calendar className="h-4 w-4 text-primary-glow" />Available {d.available}</div>
                <div className="flex items-center gap-2 text-foreground/70"><MapPin className="h-4 w-4 text-primary-glow" />{hospital.name} · {hospital.location}</div>
                <div className="flex items-center gap-2 text-foreground/70"><Clock className="h-4 w-4 text-primary-glow" />30 min consultation</div>
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">Areas of Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {[d.specialty, "Preventive Care", "Patient Education", "Diagnostics", "Long-term Management", "Second Opinions"].map((t) => (
                  <span key={t} className="rounded-full bg-accent/40 text-primary text-xs font-medium px-3 py-1.5">{t}</span>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">Practicing At</h2>
              <Link href={`/hospitals/${hospital.slug}`} className="flex items-center gap-4 rounded-2xl bg-accent/20 p-4 hover:bg-accent/30 transition-colors">
                <img src={hospital.image} alt={hospital.name} className="h-16 w-16 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-display text-lg text-primary">{hospital.name}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{hospital.location}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <a href={`tel:${hospital.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" /></a>
                  <a href={`mailto:${hospital.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /></a>
                </div>
              </Link>
            </section>

            {peers.length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-primary mb-4">Other {d.specialty} Specialists</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {peers.map(({ d: p }) => (
                    <Link key={p.slug} href={`/doctors/${p.slug}`} className="group rounded-2xl bg-card border border-border/60 p-4 hover:shadow-soft transition-all">
                      <img src={p.photo} alt={p.name} className="w-full h-32 rounded-xl object-cover" />
                      <p className="font-semibold text-primary text-sm mt-3 group-hover:underline">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.specialty}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default DoctorDetail;

