"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { useSavedDoctors } from "@/hooks/useSavedDoctors";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Calendar, Languages, GraduationCap, Award, Heart, Phone, MapPin, Clock, User, BadgeCheck, Store, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Avatar } from "@/components/common/Avatar";
import { FitText, pxRange } from "@/components/common/FitText";
import { useDoctor, useDoctorSearch, type DBDoctor, type DoctorPlace } from "@/hooks/useDoctors";
import { useHospitalsBySlugs } from "@/hooks/useHospitals";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormatters } from "@/lib/appSettings";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/data/hospitals";

/** The public site's navbar and footer around the profile, or a patient's panel. */
const Frame = ({ inPanel, className, children }: { inPanel: boolean; className?: string; children: ReactNode }) =>
  inPanel ? (
    <PatientPortalLayout>
      <div className={className}>{children}</div>
    </PatientPortalLayout>
  ) : (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className={cn("container mx-auto py-12", className)}>{children}</main>
      <Footer />
    </div>
  );

/**
 * `initialRows` is the doctor as the server read them (app/doctors/[slug]), so
 * the profile is in the page's HTML rather than behind a spinner. Left out,
 * the page fetches for itself.
 *
 * `inPanel` is the same profile opened from a patient's Find Doctors or Saved
 * Doctors (app/patient/find-doctors/[slug]): inside their panel, and every
 * doctor link on it stays there.
 */
const DoctorDetail = ({ initialRows, inPanel = false }: { initialRows?: DBDoctor[]; inPanel?: boolean }) => {
  const t = useTranslations("doctorDetail");
  const base = inPanel ? "/patient/find-doctors" : "/doctors";
  const slug = useParams<{ slug: string }>()?.slug;
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  // One page per doctor (0090). A link to one of their listings — each
  // hospital or chamber row has its own slug, and those were the URLs before —
  // still finds them: useDoctor looks up both.
  const { doctor, loading: loadingDocs } = useDoctor(slug, initialRows);
  // The patient's saved doctors (0092), for the Save button.
  const savedDoctors = useSavedDoctors();
  // Their hospitals, for each place's photo and area.
  const hospitals = useHospitalsBySlugs(doctor?.places.map((p) => p.hospitalSlug) ?? []);
  // Others in the same specialty, for the foot of the page.
  const { doctors: sameSpecialty } = useDoctorSearch({ specialty: doctor?.category || "" }, 4);

  const found = useMemo(() => (doctor ? { d: doctor } : null), [doctor]);

  // ...and then the address bar shows the doctor's one URL, not the listing's.
  useEffect(() => {
    if (found && slug && found.d.slug !== slug) router.replace(`${base}/${found.d.slug}`);
  }, [found, slug, router, base]);

  // The booking form opens here, on the profile (BookAppointmentDialog).
  // `?book=1` opens it on arrival — where sign-in sends someone who pressed
  // Book Appointment while signed out.
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState(false);
  useEffect(() => {
    if (found && !found.d.independent && found.d.bookable && searchParams?.get("book") === "1") setBooking(true);
  }, [found, searchParams]);
  const closeBooking = () => {
    setBooking(false);
    if (searchParams?.get("book") && found) router.replace(`${base}/${found.d.slug}`);
  };

  const hospitalOf = (p: DoctorPlace): Hospital | undefined => hospitals.find((h) => h.slug === p.hospitalSlug);

  if (loadingDocs) {
    return (
      <Frame inPanel={inPanel} className="py-32 text-center">
        <div className="flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Frame>
    );
  }

  if (!found) {
    return (
      <Frame inPanel={inPanel} className="py-32 text-center">
        <h1 className="font-display text-4xl text-primary">{t("notFound")}</h1>
        <Link href={base} className="mt-6 inline-flex items-center gap-2 text-primary"><ArrowLeft className="h-4 w-4" /> {t("back")}</Link>
      </Frame>
    );
  }

  const { d } = found;
  const peers = sameSpecialty
    .filter((x) => x.slug !== d.slug && x.category === d.category)
    .slice(0, 3)
    .map((p) => ({ d: p }));

  return (
    <Frame inPanel={inPanel}>
        {/* Back to wherever they came from — a doctor is reached from the
            home page, Find Doctors, a search, a hospital's own page. Opened
            from a shared link there is nowhere to go back to, so it goes to
            the doctor list. */}
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push(base))}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          // grid-cols-1 is minmax(0, 1fr): without it the phone's single
          // implicit column grew to its widest content and the page scrolled sideways.
          className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          {/* Sticky only beside the details (lg). Stacked on a phone it stayed
              pinned over them and the whole profile scrolled out of sight underneath. */}
          <div className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-card lg:sticky lg:top-24 self-start">
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
              {/* One line: 30px (text-3xl), a pixel smaller at a time for a
                  longer name, down to 20px. */}
              <FitText as="h1" text={d.name} sizes={pxRange(30, 20)} className="font-display text-primary mt-2" />
              {d.education && (
                <p className="text-sm text-foreground/75 flex items-start gap-1.5 mt-2">
                  <GraduationCap className="h-4 w-4 mt-0.5 shrink-0 text-primary-glow" />
                  <span className="whitespace-pre-line">{d.education}</span>
                </p>
              )}
              {d.designation && d.designation !== d.summary && (
                <p className="text-sm text-foreground/75 flex items-start gap-1.5 mt-1.5">
                  <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-primary-glow" />
                  <span className="whitespace-pre-line">{d.designation}</span>
                </p>
              )}
              {d.summary && (
                <p className="text-sm text-foreground/75 flex items-start gap-1.5 mt-1.5">
                  <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-primary-glow" />
                  <span className="whitespace-pre-line">{d.summary}</span>
                </p>
              )}
              {d.bmdc && (
                <p className="text-sm text-foreground/75 flex items-center gap-1.5 mt-1.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary-glow" />
                  {t("bmdc")} <span className="font-semibold text-primary">{d.bmdc}</span>
                </p>
              )}
              {d.experience != null && d.experience > 0 && (
                <p className="text-sm text-foreground/75 flex items-center gap-1.5 mt-1.5">
                  <Award className="h-4 w-4 shrink-0 text-primary-glow" />
                  <span>{t.rich("experience", { count: d.experience, b: chunks => <span className="font-semibold text-primary">{chunks}</span> })}</span>
                </p>
              )}
              {d.independent ? (
                // An appointment belongs to a hospital or a chamber; this doctor has neither yet.
                <p className="mt-5 text-center w-full rounded-full border border-border py-3 text-xs font-semibold text-muted-foreground">
                  {t("notBookable")}
                </p>
              ) : !d.bookable ? (
                // Only at listing-only hospitals (0116): their serial, by phone.
                d.serialPhone ? (
                  <a href={`tel:${d.serialPhone.replace(/[^\d+]/g, "")}`}
                    className="mt-5 flex items-center justify-center gap-2 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                    <Phone className="h-4 w-4" /> {t("callSerial", { phone: d.serialPhone })}
                  </a>
                ) : (
                  <p className="mt-5 text-center w-full rounded-full border border-border py-3 text-xs font-semibold text-muted-foreground">
                    {t("notBookable")}
                  </p>
                )
              ) : (
                // Books right here — the same form as a patient's Find Doctors.
                <button type="button" onClick={() => setBooking(true)} className="mt-5 block text-center w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                  {t("book")}
                </button>
              )}
              {/* Saves to the patient's list (0092), shown at /patient/saved-doctors.
                  Signed out, it asks them to sign in and comes back here. */}
              <button
                type="button"
                disabled={savedDoctors.busy}
                onClick={() => {
                  if (savedDoctors.sessionLoading) return;
                  if (!savedDoctors.signedIn) {
                    router.push(`/signin?next=${encodeURIComponent(`${base}/${d.slug}`)}`);
                    return;
                  }
                  if (!savedDoctors.canSave) {
                    toast.info(t("saveForPatients"));
                    return;
                  }
                  void savedDoctors.toggle(d);
                }}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
              >
                <Heart className={`h-4 w-4 ${savedDoctors.isSaved(d) ? "fill-primary" : ""}`} />
                {savedDoctors.isSaved(d) ? t("saved") : t("save")}
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary">{t("about", { name: d.name.split(" ").slice(-1)[0] })}</h2>
              {/* Their own About, as written on their profile. This used to be a
                  template — "a board-certified … specialist … patient-first
                  approach" — printed for every doctor whatever they had saved. */}
              <p className="text-foreground/75 leading-relaxed mt-3 whitespace-pre-line">
                {d.bio ?? (d.independent
                  ? t("bioIndependent", { name: d.name, specialty: d.specialty })
                  : t("bioAt", { name: d.name, specialty: d.specialty, places: d.places.map((p) => p.name).join(t("and")) }))}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
                <div className="flex items-center gap-2 text-foreground/70"><Languages className="h-4 w-4 text-primary-glow" />{d.languages.join(" · ")}</div>
                <div className="flex items-center gap-2 text-foreground/70"><Calendar className="h-4 w-4 text-primary-glow" />
                  {d.places.length > 1 ? t("atPlaces", { count: d.places.length }) : t("available", { hours: d.available })}
                </div>
                <div className="flex items-center gap-2 text-foreground/70"><Clock className="h-4 w-4 text-primary-glow" />{t("consultation")}</div>
                {d.gender && (
                  <div className="flex items-center gap-2 text-foreground/70"><User className="h-4 w-4 text-primary-glow" />{t(`gender.${d.gender}`)}</div>
                )}
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">{t("expertise")}</h2>
              <div className="flex flex-wrap gap-2">
                {/* What they listed on their profile; their specialty when they listed none. */}
                {(d.expertise.length ? d.expertise : [d.specialty]).map((e) => (
                  <span key={e} className="rounded-full bg-accent/40 text-primary text-xs font-medium px-3 py-1.5">{e}</span>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-card border border-border/60 p-7">
              <h2 className="font-display text-2xl text-primary mb-4">{t("practicingAt")}</h2>
              {d.independent ? (
                <div className="rounded-2xl bg-accent/20 p-4">
                  <p className="font-display text-lg text-primary">{d.hospital.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("independentNote")}
                  </p>
                </div>
              ) : (
                // Every place they practise, each with its own hours and fee (0090).
                <div className="space-y-3">
                  {d.places.map((p) => {
                    const h = p.kind === "hospital" ? hospitalOf(p) : undefined;
                    const hours = (
                      <>
                        {p.designation && <p className="text-xs text-foreground/75 mt-1">{p.designation}</p>}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 shrink-0" />{p.available || t("hoursNotSet")}
                        </p>
                        {/* A listing-only place (0116): the number for a serial. */}
                        {!p.bookable && p.serialPhone && (
                          <p className="text-xs font-semibold text-primary flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 shrink-0" />{t("serialAt", { phone: p.serialPhone })}
                          </p>
                        )}
                      </>
                    );
                    // What a visit here costs, large, on the right — when it is
                    // known. A place that has not set one shows a hyphen, never
                    // a guessed price and never a zero.
                    const fee = (
                      <div className="shrink-0 text-right">
                        <p className="font-display text-xl text-primary leading-none">{p.feeKnown ? formatCurrency(p.feeKnown) : "-"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{t("fee")}</p>
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
                          <p className="text-xs text-muted-foreground">{t("ownChamber")}</p>
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
                <h2 className="font-display text-2xl text-primary mb-4">{t("otherSpecialists", { specialty: d.specialty })}</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {peers.map(({ d: p }) => (
                    <Link key={p.slug} href={`${base}/${p.slug}`} className="group rounded-2xl bg-card border border-border/60 p-4 hover:shadow-soft transition-all">
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
      <BookAppointmentDialog doctor={booking ? d : null} onClose={closeBooking} />
    </Frame>
  );
};

export default DoctorDetail;

