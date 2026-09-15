"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Calendar, Languages, GraduationCap, Award, Heart, Phone, MapPin, Clock, User, BadgeCheck, Store } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Avatar } from "@/components/common/Avatar";
import { useDoctors, INDEPENDENT_LABEL, type DoctorPlace } from "@/hooks/useDoctors";
import { useHospitals } from "@/hooks/useHospitals";
import { useEffect, useMemo, useState } from "react";
import { useFormatters } from "@/lib/appSettings";
import type { Hospital } from "@/data/hospitals";

const DoctorDetail = () => {
  const slug = useParams<{ slug: string }>()?.slug;
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const { doctors, loading: loadingDocs } = useDoctors();
  const hospitals = useHospitals();

  // One page per doctor (0090). A link to one of their listings — each
  // hospital or chamber row has its own slug, and those were the URLs before —
  // still finds them.
  const found = useMemo(() => {
    if (!slug) return null;
    const doc = doctors.find((x) => x.slug === slug || x.places.some((p) => p.slug === slug));
    return doc ? { d: doc } : null;
  }, [doctors, slug]);

  // ...and then the address bar shows the doctor's one URL, not the listing's.
  useEffect(() => {
    if (found && slug && found.d.slug !== slug) router.replace(`/doctors/${found.d.slug}`);
  }, [found, slug, router]);

  // The booking form opens here, on the profile (BookAppointmentDialog).
  // `?book=1` opens it on arrival — where sign-in sends someone who pressed
  // Book Appointment while signed out.
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState(false);
  useEffect(() => {
    if (found && !found.d.independent && searchParams?.get("book") === "1") setBooking(true);
  }, [found, searchParams]);
  const closeBooking = () => {
    setBooking(false);
    if (searchParams?.get("book") && found) router.replace(`/doctors/${found.d.slug}`);
  };

  const hospitalOf = (p: DoctorPlace): Hospital | undefined => hospitals.find((h) => h.slug === p.hospitalSlug);

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

  const { d } = found;
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
              {d.photo ? (
                <img src={d.photo} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <Avatar src={null} name={d.name} className="h-36 w-36 text-5xl" />
                </div>
              )}
              <span className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-3 py-1 text-xs font-semibold text-primary">
                <Star className="h-3 w-3 fill-accent text-accent" />{d.rating}
              </span>
            </div>
            <div className="p-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary-glow">{d.specialty}</span>
              <h1 className="font-display text-3xl text-primary mt-2">{d.name}</h1>
              {d.education && (
                <p className="text-sm text-foreground/75 flex items-start gap-1.5 mt-2">
                  <GraduationCap className="h-4 w-4 mt-0.5 shrink-0 text-primary-glow" />{d.education}
                </p>
              )}
              {d.bmdc && (
                <p className="text-sm text-foreground/75 flex items-center gap-1.5 mt-1.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary-glow" />
                  BMDC Reg. No. <span className="font-semibold text-primary">{d.bmdc}</span>
                </p>
              )}
              {d.experience != null && d.experience > 0 && (
                <p className="text-sm text-foreground/75 flex items-center gap-1.5 mt-1.5">
                  <Award className="h-4 w-4 shrink-0 text-primary-glow" />
                  <span><span className="font-semibold text-primary">{d.experience}</span> {d.experience === 1 ? "year" : "years"} of experience</span>
                </p>
              )}
              {d.independent ? (
                // An appointment belongs to a hospital or a chamber; this doctor has neither yet.
                <p className="mt-5 text-center w-full rounded-full border border-border py-3 text-xs font-semibold text-muted-foreground">
                  Not taking bookings on HealthFlow yet
                </p>
              ) : (
                // Books right here — the same form as a patient's Find Doctors.
                <button type="button" onClick={() => setBooking(true)} className="mt-5 block text-center w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                  Book Appointment
                </button>
              )}
              <button onClick={() => toast.success(`${d.name} saved to favorites`)} className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
                <Heart className="h-4 w-4" /> Save
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary">About Dr. {d.name.split(" ").slice(-1)[0]}</h2>
              {/* Their own About, as written on their profile. This used to be a
                  template — "a board-certified … specialist … patient-first
                  approach" — printed for every doctor whatever they had saved. */}
              <p className="text-foreground/75 leading-relaxed mt-3 whitespace-pre-line">
                {d.bio ?? `${d.name} is a ${d.specialty.toLowerCase()} specialist${d.independent ? " in independent practice" : ` at ${d.places.map((p) => p.name).join(" and ")}`}.`}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
                <div className="flex items-center gap-2 text-foreground/70"><Languages className="h-4 w-4 text-primary-glow" />{d.languages.join(" · ")}</div>
                <div className="flex items-center gap-2 text-foreground/70"><Calendar className="h-4 w-4 text-primary-glow" />
                  {d.places.length > 1 ? `At ${d.places.length} places — hours for each below` : `Available ${d.available}`}
                </div>
                <div className="flex items-center gap-2 text-foreground/70"><MapPin className="h-4 w-4 text-primary-glow" />
                  {d.places.length ? d.places.map((p) => p.name).join(" · ") : `${d.hospital.name} · ${d.hospital.location}`}
                </div>
                <div className="flex items-center gap-2 text-foreground/70"><Clock className="h-4 w-4 text-primary-glow" />30 min consultation</div>
                {d.gender && (
                  <div className="flex items-center gap-2 text-foreground/70 capitalize"><User className="h-4 w-4 text-primary-glow" />{d.gender}</div>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">Areas of Expertise</h2>
              <div className="flex flex-wrap gap-2">
                {/* What they listed on their profile; their specialty when they listed none. */}
                {(d.expertise.length ? d.expertise : [d.specialty]).map((t) => (
                  <span key={t} className="rounded-full bg-accent/40 text-primary text-xs font-medium px-3 py-1.5">{t}</span>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">Practicing At</h2>
              {d.independent ? (
                <div className="rounded-2xl bg-accent/20 p-4">
                  <p className="font-display text-lg text-primary">{INDEPENDENT_LABEL}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Not at a HealthFlow hospital or chamber yet, so not taking bookings here.
                  </p>
                </div>
              ) : (
                // Every place they practise, each with its own hours and fee (0090).
                <div className="space-y-3">
                  {d.places.map((p) => {
                    const h = p.kind === "hospital" ? hospitalOf(p) : undefined;
                    const hours = (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 shrink-0" />{p.available || "Hours not set"}
                      </p>
                    );
                    // What a visit here costs, large, on the right.
                    const fee = (
                      <div className="shrink-0 text-right">
                        <p className="font-display text-xl text-primary leading-none">{formatCurrency(p.fee)}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Consultation fee</p>
                      </div>
                    );
                    return p.kind === "chamber" ? (
                      // Their own chamber (0088): no hospital page behind it, so
                      // the address and phone are right here.
                      <div key={p.id} className="flex items-center gap-4 rounded-2xl bg-accent/20 p-4">
                        <div className="h-16 w-16 shrink-0 rounded-xl bg-card grid place-items-center text-primary">
                          <Store className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-xl text-primary">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Their own chamber</p>
                          <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1.5">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            {[p.address, ...p.location.split(", ")].filter((part, i, all) => part && all.indexOf(part) === i).join(", ")}
                          </p>
                          {p.phone && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />{p.phone}
                            </p>
                          )}
                          {hours}
                        </div>
                        {fee}
                      </div>
                    ) : (
                      <Link key={p.id} href={`/hospitals/${p.hospitalSlug}`}
                        className="flex items-center gap-4 rounded-2xl bg-accent/20 p-4 hover:bg-accent/30 transition-colors">
                        <img src={h?.image ?? "/assets/hub-atrium.jpg"} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-xl text-primary hover:text-primary-glow">{p.name}</p>
                          {(h?.location || p.location) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{h?.location || p.location}</p>
                          )}
                          {hours}
                        </div>
                        {fee}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {peers.length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-primary mb-4">Other {d.specialty} Specialists</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {peers.map(({ d: p }) => (
                    <Link key={p.slug} href={`/doctors/${p.slug}`} className="group rounded-2xl bg-card border border-border/60 p-4 hover:shadow-soft transition-all">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-32 rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-32 w-full place-items-center rounded-xl bg-gradient-to-br from-accent/40 to-primary/10">
                          <Avatar src={null} name={p.name} className="h-16 w-16 text-lg" />
                        </div>
                      )}
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
      <BookAppointmentDialog doctor={booking ? d : null} onClose={closeBooking} />
    </div>
  );
};

export default DoctorDetail;

