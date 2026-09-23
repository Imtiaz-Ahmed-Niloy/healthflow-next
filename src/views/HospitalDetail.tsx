"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MapPin, Award, Star, Phone, Mail, Globe, ArrowLeft, BedDouble,
  Stethoscope, Calendar, Clock, CheckCircle2, Building2, Search,
  FlaskConical, Hotel, Users, Sparkles,
  Facebook, Twitter, Instagram, Youtube, Linkedin,
} from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Avatar } from "@/components/common/Avatar";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHospital } from "@/hooks/useHospitals";
import { useDoctors } from "@/hooks/useDoctors";
import { DoctorCard } from "@/components/site/DoctorCard";
import { useFormatters } from "@/lib/appSettings";

const HospitalDetail = () => {
  const t = useTranslations("hospitalDetail");
  const { formatCurrency } = useFormatters();
  const slug = useParams<{ slug: string }>()?.slug;
  const { hospital, hospitals, loading } = useHospital(slug ?? "");
  const { doctors: allDoctors } = useDoctors();

  const [docQuery, setDocQuery] = useState("");
  const [docSpec, setDocSpec] = useState("All");
  const [labCat, setLabCat] = useState("All");
  const [roomCat, setRoomCat] = useState<"All" | "Ward" | "Cabin" | "ICU">("All");

  // The same doctor cards as the home page and /doctors: real rows from
  // doctors_public (via useDoctors), filtered to whoever practises here.
  const hospitalDoctors = useMemo(
    () => (hospital ? allDoctors.filter((d) => d.places.some((p) => p.hospitalSlug === hospital.slug)) : []),
    [allDoctors, hospital],
  );
  const specialties = useMemo(
    () => ["All", ...Array.from(new Set(hospitalDoctors.map((d) => d.specialty)))],
    [hospitalDoctors],
  );
  const labCats = useMemo(
    () => ["All", ...Array.from(new Set(hospital?.lab_tests.map((test) => test.category) ?? []))],
    [hospital],
  );
  const filteredDoctors = useMemo(
    () => hospitalDoctors.filter(
      (d) =>
        (docSpec === "All" || d.specialty === docSpec) &&
        (d.name.toLowerCase().includes(docQuery.toLowerCase()) ||
          d.specialty.toLowerCase().includes(docQuery.toLowerCase())),
    ),
    [hospitalDoctors, docQuery, docSpec],
  );
  const filteredLabs = useMemo(
    () => (hospital?.lab_tests ?? []).filter((test) => labCat === "All" || test.category === labCat),
    [hospital, labCat],
  );
  const filteredRooms = useMemo(
    () => (hospital?.rooms ?? []).filter((r) => roomCat === "All" || r.category === roomCat),
    [hospital, roomCat],
  );

  // Hospitals now arrive from the database, so "not yet loaded" must not be
  // reported as "does not exist".
  if (!hospital && loading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <main className="container mx-auto py-32 text-center">
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navbar />
        <main className="container mx-auto py-32 text-center">
          <h1 className="font-display text-4xl text-primary">{t("notFound")}</h1>
          <Link href="/hospitals" className="mt-6 inline-flex items-center gap-2 text-primary">
            <ArrowLeft className="h-4 w-4" /> {t("backAll")}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const related = hospitals.filter((h) => h.slug !== hospital.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2 }}
            src={hospital.image}
            alt={hospital.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-primary/30" />
          <div className="container mx-auto relative h-full flex flex-col justify-end pb-12 text-primary-foreground">
            <Link href="/hospitals" className="inline-flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100 mb-6 w-fit">
              <ArrowLeft className="h-4 w-4" /> {t("allHospitals")}
            </Link>
            <div className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                {/* Partner hospitals only; a pending one has no tag. */}
                {hospital.tag && (
                  <span className="mb-4 inline-flex items-center rounded-full bg-accent/90 text-primary px-3 py-1 text-[11px] font-semibold">
                    {hospital.tag.toUpperCase()}
                  </span>
                )}
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl leading-tight">{hospital.name}</h1>
              </motion.div>

              {/* The hospital's own logo, beside the title on the cover photo.
                  On its own light panel rather than bare on the image: the cover
                  is a photograph we do not control, and a dark logo laid
                  straight onto a dark one would disappear. Stacks above the
                  title on mobile (flex-col-reverse), where there is no room
                  beside it. Most hospitals have no logo, so the panel is not
                  rendered at all rather than left as an empty square. */}
              {hospital.logo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="shrink-0 self-start rounded-2xl bg-card/95 backdrop-blur-sm border border-white/25 shadow-card p-5 md:mr-20 md:mb-6 md:self-end"
                >
                  <img
                    src={hospital.logo}
                    alt={t("logoAlt", { name: hospital.name })}
                    /* Contained, never cropped — a cropped logo is a damaged
                       logo — and capped so a tall or very wide one cannot
                       crowd out the title. */
                    className="h-24 w-auto max-w-[220px] object-contain md:h-32 md:max-w-[280px]"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container mx-auto -mt-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border/60 rounded-3xl shadow-card p-6"
          >
            {[
              { icon: BedDouble, label: t("stats.beds"), value: hospital.beds },
              { icon: Stethoscope, label: t("stats.specialists"), value: hospital.doctors },
              { icon: Star, label: t("stats.rating"), value: hospital.rating },
              { icon: Building2, label: t("stats.specialties"), value: hospital.specialties.length },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl text-primary leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Body */}
        <section className="container mx-auto py-16 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h2 className="font-display text-3xl text-primary">{t("about", { name: hospital.name })}</h2>
              <p className="text-muted-foreground leading-relaxed mt-4">{hospital.about}</p>
              {hospital.summary && (
                <>
                  {/* Guarded, unlike `about` above: a heading with nothing under
                      it reads as a broken page, and summary is optional. */}
                  <h3 className="font-display text-lg text-primary mt-6 mb-2">{t("summary")}</h3>
                  <p className="text-muted-foreground leading-relaxed">{hospital.summary}</p>
                </>
              )}
            </motion.div>

            <div>
              <h3 className="font-display text-2xl text-primary mb-4">{t("specialties")}</h3>
              <div className="flex flex-wrap gap-2">
                {hospital.specialties.map((s, i) => (
                  <motion.span
                    key={s}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 py-2 rounded-full bg-accent/40 text-primary text-sm font-medium"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl text-primary mb-4">{t("facilities")}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {hospital.facilities.map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 hover:shadow-soft transition-all"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary-glow shrink-0" />
                    <span className="text-sm text-foreground/80">{f}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-2xl text-primary mb-4">{t("awards")}</h3>
              <div className="space-y-3">
                {hospital.awards.map((a) => (
                  <div key={a} className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent/30 to-transparent p-4 border-l-4 border-primary-glow">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl bg-card border border-border/60 shadow-card p-6 sticky top-24"
            >
              <h3 className="font-display text-xl text-primary">{t("contact")}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{hospital.location}</span>
                {hospital.cert && <span className="inline-flex items-center gap-1 text-primary font-medium"><Award className="h-3.5 w-3.5" />{hospital.cert}</span>}
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{hospital.rating} ({t("reviews", { count: hospital.reviews })})</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{t("est", { year: hospital.founded })}</span>
              </div>
              {(() => {
                const phones = hospital.phones?.length ? hospital.phones : (hospital.phone ? [hospital.phone] : []);
                const emails = hospital.emails?.length ? hospital.emails : (hospital.email ? [hospital.email] : []);
                const websites = hospital.websites?.length ? hospital.websites : (hospital.website ? [hospital.website] : []);
                const socials = hospital.social ?? [];
                const socialIcon = (p: string) => {
                  const k = p.toLowerCase();
                  if (k === "facebook") return Facebook;
                  if (k === "twitter") return Twitter;
                  if (k === "instagram") return Instagram;
                  if (k === "linkedin") return Linkedin;
                  if (k === "youtube") return Youtube;
                  return Globe;
                };
                return (
                  <div className="space-y-3 mt-4 text-sm">
                    <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span className="text-foreground/80">{hospital.address}</span></div>
                    {phones.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1">
                          {phones.map((p) => (
                            <a key={p} href={`tel:${p}`} className="text-foreground/80 hover:text-primary">{p}</a>
                          ))}
                        </div>
                      </div>
                    )}
                    {emails.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1 break-all">
                          {emails.map((e) => (
                            <a key={e} href={`mailto:${e}`} className="text-foreground/80 hover:text-primary">{e}</a>
                          ))}
                        </div>
                      </div>
                    )}
                    {websites.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1 break-all">
                          {websites.map((w) => (
                            <a key={w} href={w.startsWith("http") ? w : `https://${w}`} target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-primary">{w.replace(/^https?:\/\//, "")}</a>
                          ))}
                        </div>
                      </div>
                    )}
                    {phones.length === 0 && emails.length === 0 && websites.length === 0 && (
                      <p className="text-muted-foreground">
                        {t("noContact")}
                      </p>
                    )}
                    {socials.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("follow")}</p>
                        <div className="flex flex-wrap gap-2">
                          {socials.map((s, i) => {
                            const Icon = socialIcon(s.platform);
                            return (
                              <a key={`${s.platform}-${i}`} href={s.url} target="_blank" rel="noreferrer"
                                title={s.platform}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                                <Icon className="h-4 w-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="mt-6 pt-6 border-t border-border/60">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{t("hours")}</h4>
                <div className="space-y-2 text-sm">
                  {hospital.hours.map((h) => (
                    <div key={h.day} className="flex justify-between">
                      <span className="text-foreground/70">{h.day}</span>
                      <span className="font-medium text-primary">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {hospital.phone && (
                <a href={`tel:${hospital.phone}`} className="mt-6 block w-full text-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                  {t("callNow")}
                </a>
              )}
            </motion.div>
          </aside>
        </section>

        {/* Doctors */}
        <section className="relative container mx-auto pb-16">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="pt-12 flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                <Stethoscope className="h-3 w-3" /> {t("clinicalTeam")}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">{t("meetDoctors")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("meetDoctorsSub", { name: hospital.name })}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={docQuery}
                  onChange={(e) => setDocQuery(e.target.value)}
                  placeholder={t("searchDoctors")}
                  className="pl-9 w-64 rounded-full"
                />
              </div>
              <select
                value={docSpec}
                onChange={(e) => setDocSpec(e.target.value)}
                className="rounded-full border border-border/60 bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {specialties.map((s) => <option key={s} value={s}>{s === "All" ? t("all") : s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDoctors.map((d, i) => (
              <DoctorCard key={d.id} d={d} i={i} />
            ))}
            {filteredDoctors.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-10">
                {hospitalDoctors.length === 0 ? t("noDoctors") : t("noDoctorMatch")}
              </p>
            )}
          </div>
        </section>

        {/* Lab Tests */}
        <section className="container mx-auto pb-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-3xl text-primary flex items-center gap-2"><FlaskConical className="h-7 w-7" /> {t("labTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("labSub")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {labCats.map((c) => (
                <button
                  key={c}
                  onClick={() => setLabCat(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${labCat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}
                >{c === "All" ? t("all") : c}</button>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft">
            <Table>
              <TableHeader>
                <TableRow className="bg-accent/20">
                  <TableHead>{t("lab.test")}</TableHead>
                  <TableHead>{t("lab.category")}</TableHead>
                  <TableHead>{t("lab.turnaround")}</TableHead>
                  <TableHead className="text-right">{t("lab.price")}</TableHead>
                  <TableHead className="text-right">{t("lab.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabs.map((test) => (
                  <TableRow key={test.name}>
                    <TableCell className="font-medium text-primary">{test.name}</TableCell>
                    <TableCell className="text-muted-foreground">{test.category}</TableCell>
                    <TableCell className="text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{test.turnaround}</TableCell>
                    <TableCell className="text-right font-display text-primary">{formatCurrency(test.price)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/lab-tests?test=${encodeURIComponent(test.name)}`} className="text-xs font-semibold text-primary hover:underline">{t("lab.book")}</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </section>

        {/* Rooms */}
        <section className="container mx-auto pb-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                <Hotel className="h-3 w-3" /> {t("rooms.label")}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">{t("rooms.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("rooms.sub")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["All", "Ward", "Cabin", "ICU"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setRoomCat(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${roomCat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}
                >{t(`rooms.cat.${c}`)}</button>
              ))}
            </div>
          </div>

          {/* Summary stats strip */}
          {hospital.rooms.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: t("rooms.total"), value: hospital.rooms.reduce((a, r) => a + r.total, 0), icon: BedDouble },
                { label: t("rooms.availableNow"), value: hospital.rooms.reduce((a, r) => a + r.available, 0), icon: CheckCircle2 },
                { label: t("rooms.tiers"), value: hospital.rooms.length, icon: Hotel },
                { label: t("rooms.from"), value: formatCurrency(Math.min(...hospital.rooms.map((r) => r.price))), icon: Sparkles },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><s.icon className="h-4 w-4" /></div>
                  <div>
                    <p className="font-display text-lg text-primary leading-none">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((r, i) => {
              const pct = r.total > 0 ? Math.round((r.available / r.total) * 100) : 0;
              const status = r.available === 0 ? t("rooms.full") : r.available <= 2 ? t("rooms.limited") : t("rooms.available");
              const statusColor = r.available === 0 ? "bg-destructive/15 text-destructive" : r.available <= 2 ? "bg-amber-500/15 text-amber-700" : "bg-primary-glow/15 text-primary";
              return (
                <motion.div
                  key={r.type}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-3xl bg-gradient-to-br from-card via-card to-accent/30 border border-border/60 p-6 hover:shadow-card hover:-translate-y-1 transition-all overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary-glow/10 group-hover:bg-primary-glow/20 transition-colors" />

                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-glow">{r.category}</span>
                      <h4 className="font-display text-xl text-primary mt-1.5 leading-tight">{r.type}</h4>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor}`}>{status}</span>
                  </div>

                  {r.included.length > 0 && (
                    <div className="relative mt-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t("rooms.included")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {r.included.map((it) => (
                          <span key={it} className="inline-flex items-center gap-1 rounded-full bg-accent/50 text-primary px-2 py-0.5 text-[10px] font-medium">
                            <CheckCircle2 className="h-2.5 w-2.5" />{it}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative mt-4">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t("rooms.availability")}</span>
                      <span className="font-semibold text-primary">{r.available}/{r.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full bg-gradient-to-r from-primary to-primary-glow"
                      />
                    </div>
                  </div>

                  <div className="relative flex items-end justify-between mt-5 pt-5 border-t border-border/40">
                    <div>
                      <span className="font-display text-3xl text-primary">{formatCurrency(r.price)}</span>
                      <span className="text-[10px] uppercase text-muted-foreground ml-1">{t("rooms.perNight")}</span>
                    </div>
                    <Link href={r.available === 0 ? "#" : `/reserve-room?hospital=${hospital.slug}&room=${encodeURIComponent(r.type)}`}
                      onClick={(e) => { if (r.available === 0) e.preventDefault(); }}
                      className={`rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition-colors ${r.available === 0 ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      {t("rooms.reserve")}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
            {filteredRooms.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-10">
                {hospital.rooms.length === 0 ? t("rooms.noRooms") : t("rooms.noRoomMatch")}
              </p>
            )}
          </div>
        </section>

        {/* Management */}
        <section className="container mx-auto pb-16">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Users className="h-3 w-3" /> {t("management.label")}
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">{t("management.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("management.sub", { name: hospital.name })}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hospital.management.map((m, i) => (
              <motion.article
                key={m.name + i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="rounded-3xl bg-card border border-border/60 p-6 hover:shadow-card hover:-translate-y-1 transition-all duration-500"
              >
                <Avatar src={null} name={m.name} className="h-14 w-14 text-lg" />
                <h3 className="font-display text-lg text-primary mt-4 leading-tight">{m.name}</h3>
                {m.role && <p className="text-xs text-primary-glow font-semibold uppercase tracking-wider mt-1">{m.role}</p>}
                {(m.email || m.phone) && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-accent/40 text-primary py-2 text-[11px] font-semibold hover:bg-accent/60 transition-colors">
                        <Mail className="h-3 w-3" />{t("management.email")}
                      </a>
                    )}
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground py-2 text-[11px] font-semibold hover:bg-primary-glow transition-colors">
                        <Phone className="h-3 w-3" />{t("management.phone")}
                      </a>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
            {hospital.management.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-10">{t("management.noManagement")}</p>
            )}
          </div>
        </section>

        {/* Related */}
        <section className="container mx-auto pb-20">
          <h3 className="font-display text-2xl text-primary mb-6">{t("related")}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((h) => (
              <Link
                key={h.slug}
                href={`/hospitals/${h.slug}`}
                className="group rounded-3xl overflow-hidden bg-card border border-border/60 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
              >
                <div className="h-40 overflow-hidden">
                  <img src={h.image} alt={h.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="p-5">
                  <h4 className="font-display text-lg text-primary">{h.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{h.location}</p>
                  <p className="text-sm text-foreground/70 mt-3 line-clamp-2">{h.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HospitalDetail;

