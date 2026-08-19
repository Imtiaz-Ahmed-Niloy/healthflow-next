"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Calendar, Languages, GraduationCap, Award, Heart, Mail, Phone, MapPin, Clock, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { useDoctors } from "@/hooks/useDoctors";
import { useHospitals } from "@/hooks/useHospitals";
import { useMemo } from "react";
import type { Hospital } from "@/data/hospitals";

const DoctorDetail = () => {
  const slug = useParams<{ slug: string }>()?.slug;
  const { doctors, loading: loadingDocs } = useDoctors();
  const hospitals = useHospitals();

  const found = useMemo(() => {
    if (!slug) return null;
    const doc = doctors.find((x) => x.slug === slug);
    if (!doc) return null;

    const hospital = hospitals.find((h) => h.slug === doc.hospital.slug) || {
      name: doc.hospital.name,
      slug: doc.hospital.slug,
      location: doc.hospital.location,
      image: "/assets/hub-atrium.jpg",
      phone: "",
      email: "",
      doctors_list: [],
      lab_tests: [],
      rooms: [],
      management: [],
      tag: "Partner Hospital",
      address: doc.hospital.location,
      rating: 0,
      reviews: 0,
      beds: 0,
      doctors: 0,
      founded: new Date().getFullYear(),
      specialties: [],
      cert: "Partner Hospital",
      phones: [],
      emails: [],
      websites: [],
      website: "",
      social: [],
      summary: "",
      about: "",
      facilities: [],
      awards: [],
      hours: []
    } as Hospital;

    return { d: doc, hospital };
  }, [doctors, hospitals, slug]);

  if (loadingDocs) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <main className="container mx-auto py-32 text-center">
          <div className="flex justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
  const peers = doctors
    .filter((x) => x.slug !== d.slug && x.category === d.category)
    .slice(0, 3)
    .map((p) => ({ d: p }));

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
              <Link href={`/patient/find-doctors?q=${encodeURIComponent(d.name)}`} className="mt-5 block text-center w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
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
                {d.gender && (
                  <div className="flex items-center gap-2 text-foreground/70 capitalize"><User className="h-4 w-4 text-primary-glow" />{d.gender}</div>
                )}
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
              <div className="flex items-center gap-4 rounded-2xl bg-accent/20 p-4 hover:bg-accent/30 transition-colors">
                <Link href={`/hospitals/${hospital.slug}`} className="flex items-center gap-4 flex-1">
                  <img src={hospital.image} alt={hospital.name} className="h-16 w-16 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-display text-lg text-primary hover:text-primary-glow">{hospital.name}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{hospital.location}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <a href={`tel:${hospital.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" /></a>
                  <a href={`mailto:${hospital.email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /></a>
                </div>
              </div>
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

