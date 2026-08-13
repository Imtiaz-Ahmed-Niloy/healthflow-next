"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  MapPin, Award, Star, Phone, Mail, Globe, ArrowLeft, BedDouble,
  Stethoscope, Calendar, Clock, CheckCircle2, Building2, Search,
  FlaskConical, Hotel, Users, GraduationCap, Languages, Heart,
  Linkedin, Briefcase, Maximize2, Eye, Wifi, Utensils, Sparkles,
  Facebook, Twitter, Instagram, Youtube,
} from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHospital } from "@/hooks/useHospitals";
import { slugify } from "@/lib/slug";

const HospitalDetail = () => {
  const slug = useParams<{ slug: string }>()?.slug;
  const { hospital, hospitals, loading } = useHospital(slug ?? "");

  const [docQuery, setDocQuery] = useState("");
  const [docSpec, setDocSpec] = useState("All");
  const [labCat, setLabCat] = useState("All");
  const [roomCat, setRoomCat] = useState<"All" | "Ward" | "Cabin" | "ICU" | "Bed">("All");

  const specialties = useMemo(
    () => ["All", ...Array.from(new Set(hospital?.doctors_list.map((d) => d.specialty) ?? []))],
    [hospital],
  );
  const labCats = useMemo(
    () => ["All", ...Array.from(new Set(hospital?.lab_tests.map((t) => t.category) ?? []))],
    [hospital],
  );
  const filteredDoctors = useMemo(() => {
    if (!hospital) return [];
    return hospital.doctors_list.filter(
      (d) =>
        (docSpec === "All" || d.specialty === docSpec) &&
        (d.name.toLowerCase().includes(docQuery.toLowerCase()) ||
          d.specialty.toLowerCase().includes(docQuery.toLowerCase())),
    );
  }, [hospital, docQuery, docSpec]);
  const filteredLabs = useMemo(
    () => (hospital?.lab_tests ?? []).filter((t) => labCat === "All" || t.category === labCat),
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
          <p className="text-sm text-muted-foreground">Loading hospital…</p>
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
          <h1 className="font-display text-4xl text-primary">Hospital not found</h1>
          <Link href="/hospitals" className="mt-6 inline-flex items-center gap-2 text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to all hospitals
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
              <ArrowLeft className="h-4 w-4" /> All Hospitals
            </Link>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center rounded-full bg-accent/90 text-primary px-3 py-1 text-[11px] font-semibold">
                {hospital.tag.toUpperCase()}
              </span>
              <h1 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-tight">{hospital.name}</h1>
              <div className="flex flex-wrap gap-5 mt-5 text-sm opacity-95">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{hospital.location}</span>
                <span className="inline-flex items-center gap-1.5"><Award className="h-4 w-4" />{hospital.cert}</span>
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-accent text-accent" />{hospital.rating} ({hospital.reviews} reviews)</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />Est. {hospital.founded}</span>
              </div>
            </motion.div>
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
              { icon: BedDouble, label: "Beds", value: hospital.beds },
              { icon: Stethoscope, label: "Specialists", value: hospital.doctors },
              { icon: Star, label: "Patient Rating", value: hospital.rating },
              { icon: Building2, label: "Specialties", value: hospital.specialties.length },
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
              <h2 className="font-display text-3xl text-primary">About {hospital.name}</h2>
              <p className="text-muted-foreground leading-relaxed mt-4">{hospital.about}</p>
              <p className="text-muted-foreground leading-relaxed mt-3">{hospital.summary}</p>
            </motion.div>

            <div>
              <h3 className="font-display text-2xl text-primary mb-4">Specialties</h3>
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
              <h3 className="font-display text-2xl text-primary mb-4">Facilities & Amenities</h3>
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
              <h3 className="font-display text-2xl text-primary mb-4">Awards & Recognition</h3>
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
              <h3 className="font-display text-xl text-primary">Contact & Visit</h3>
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
                    {socials.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Follow</p>
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Hours</h4>
                <div className="space-y-2 text-sm">
                  {hospital.hours.map((h) => (
                    <div key={h.day} className="flex justify-between">
                      <span className="text-foreground/70">{h.day}</span>
                      <span className="font-medium text-primary">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/patient/find-doctors" className="mt-6 block w-full text-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                Book Appointment
              </Link>
              <a href={`tel:${hospital.phone}`} className="mt-3 block w-full text-center rounded-full border border-primary/30 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors">
                Call Now
              </a>
            </motion.div>
          </aside>
        </section>

        {/* Doctors */}
        <section className="relative container mx-auto pb-16">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="pt-12 flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                <Stethoscope className="h-3 w-3" /> Clinical Team
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">Meet Our Doctors</h2>
              <p className="text-sm text-muted-foreground mt-1">Browse the in-house specialists at {hospital.name}.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={docQuery}
                  onChange={(e) => setDocQuery(e.target.value)}
                  placeholder="Search doctors..."
                  className="pl-9 w-64 rounded-full"
                />
              </div>
              <select
                value={docSpec}
                onChange={(e) => setDocSpec(e.target.value)}
                className="rounded-full border border-border/60 bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {specialties.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDoctors.map((d, i) => (
              <motion.article
                key={d.name + i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="group relative rounded-3xl bg-card border border-border/60 overflow-hidden hover:shadow-card hover:-translate-y-1.5 transition-all duration-500"
              >
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-accent/40 to-primary/10">
                  <img
                    src={d.photo}
                    alt={d.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent opacity-90" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Star className="h-3 w-3 fill-accent text-accent" />{d.rating}
                  </div>
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary-glow/90 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                    {d.specialty}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-primary-foreground">
                    <h3 className="font-display text-xl leading-tight">{d.name}</h3>
                    <p className="text-[11px] opacity-90 mt-0.5 inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{d.education}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-xl bg-accent/30 py-2.5">
                      <p className="font-display text-base text-primary">{d.experience}+</p>
                      <p className="text-muted-foreground">Years</p>
                    </div>
                    <div className="rounded-xl bg-accent/30 py-2.5">
                      <p className="font-display text-base text-primary">{(d.patients / 1000).toFixed(1)}k</p>
                      <p className="text-muted-foreground">Patients</p>
                    </div>
                    <div className="rounded-xl bg-accent/30 py-2.5">
                      <p className="font-display text-base text-primary">${d.fee}</p>
                      <p className="text-muted-foreground">Fee</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-foreground/70">
                    <div className="flex items-center gap-2"><Languages className="h-3.5 w-3.5 text-primary-glow shrink-0" /><span>{d.languages.join(" • ")}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary-glow shrink-0" /><span>Available {d.available}</span></div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <Link href={`/doctors/${slugify(d.name)}`} className="flex-1 text-center rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">
                      View Profile
                    </Link>
                    <Link href="/patient/find-doctors" className="rounded-full border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
                      Book
                    </Link>
                    <button className="rounded-full border border-primary/30 p-2 text-primary hover:bg-primary/5 transition-colors" aria-label="Save">
                      <Heart className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
            {filteredDoctors.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-10">No doctors match your filters.</p>
            )}
          </div>
        </section>

        {/* Lab Tests */}
        <section className="container mx-auto pb-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-3xl text-primary flex items-center gap-2"><FlaskConical className="h-7 w-7" /> Lab Tests & Pricing</h2>
              <p className="text-sm text-muted-foreground mt-1">Transparent pricing for diagnostic services.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {labCats.map((c) => (
                <button
                  key={c}
                  onClick={() => setLabCat(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${labCat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}
                >{c}</button>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-soft">
            <Table>
              <TableHeader>
                <TableRow className="bg-accent/20">
                  <TableHead>Test</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Turnaround</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabs.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-medium text-primary">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category}</TableCell>
                    <TableCell className="text-muted-foreground inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{t.turnaround}</TableCell>
                    <TableCell className="text-right font-display text-primary">${t.price}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/lab-tests?test=${encodeURIComponent(t.name)}`} className="text-xs font-semibold text-primary hover:underline">Book →</Link>
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
                <Hotel className="h-3 w-3" /> Accommodation
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">Wards, Cabins & Beds</h2>
              <p className="text-sm text-muted-foreground mt-1">Daily rates, real-time availability and full amenity breakdown.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["All", "Ward", "Cabin", "ICU", "Bed"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setRoomCat(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${roomCat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Summary stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Rooms", value: hospital.rooms.reduce((a, r) => a + r.total, 0), icon: BedDouble },
              { label: "Available Now", value: hospital.rooms.reduce((a, r) => a + r.available, 0), icon: CheckCircle2 },
              { label: "Tier Options", value: hospital.rooms.length, icon: Hotel },
              { label: "Starting From", value: `$${Math.min(...hospital.rooms.map((r) => r.price))}`, icon: Sparkles },
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((r, i) => {
              const pct = Math.round((r.available / r.total) * 100);
              const status = r.available === 0 ? "Full" : r.available <= 2 ? "Limited" : "Available";
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
                      <p className="text-xs text-muted-foreground mt-0.5">{r.capacity}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor}`}>{status}</span>
                  </div>

                  <div className="relative grid grid-cols-2 gap-2 mt-4 text-[11px]">
                    <div className="flex items-center gap-1.5 text-foreground/70"><Maximize2 className="h-3 w-3 text-primary-glow" />{r.size}</div>
                    <div className="flex items-center gap-1.5 text-foreground/70"><Eye className="h-3 w-3 text-primary-glow" />{r.view}</div>
                  </div>

                  <div className="relative mt-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Included</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.included.map((it) => (
                        <span key={it} className="inline-flex items-center gap-1 rounded-full bg-accent/50 text-primary px-2 py-0.5 text-[10px] font-medium">
                          <CheckCircle2 className="h-2.5 w-2.5" />{it}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-4">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Availability</span>
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
                      <span className="font-display text-3xl text-primary">${r.price}</span>
                      <span className="text-[10px] uppercase text-muted-foreground ml-1">/night</span>
                    </div>
                    <Link href={r.available === 0 ? "#" : `/reserve-room?hospital=${hospital.slug}&room=${encodeURIComponent(r.type)}`}
                      onClick={(e) => { if (r.available === 0) e.preventDefault(); }}
                      className={`rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-glow transition-colors ${r.available === 0 ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      Reserve
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-accent/20 border border-border/60 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5 text-primary-glow" />3 meals included on all stays</span>
            <span className="inline-flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-primary-glow" />Complimentary high-speed Wi-Fi</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary-glow" />Daily housekeeping & linen change</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary-glow" />24/7 nurse call response &lt; 2 min</span>
          </div>
        </section>

        {/* Management */}
        <section className="container mx-auto pb-16">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Users className="h-3 w-3" /> Leadership
            </span>
            <h2 className="font-display text-3xl md:text-4xl text-primary mt-3">Hospital Management</h2>
            <p className="text-sm text-muted-foreground mt-1">The executive team guiding {hospital.name}.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hospital.management.map((m, i) => (
              <motion.article
                key={m.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="group relative rounded-3xl bg-card border border-border/60 overflow-hidden hover:shadow-card hover:-translate-y-1.5 transition-all duration-500"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={m.photo}
                    alt={m.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                </div>
                <div className="px-5 pb-5 -mt-8 relative">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-soft">
                    <Briefcase className="h-3 w-3" />{m.tenure}
                  </div>
                  <h3 className="font-display text-xl text-primary mt-3 leading-tight">{m.name}</h3>
                  <p className="text-xs text-primary-glow font-semibold uppercase tracking-wider mt-1">{m.role}</p>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">{m.bio}</p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
                    <a href={`mailto:${m.email}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-accent/40 text-primary py-2 text-[11px] font-semibold hover:bg-accent/60 transition-colors">
                      <Mail className="h-3 w-3" />Email
                    </a>
                    <a href={`https://${m.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground py-2 text-[11px] font-semibold hover:bg-primary-glow transition-colors">
                      <Linkedin className="h-3 w-3" />LinkedIn
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="container mx-auto pb-20">
          <h3 className="font-display text-2xl text-primary mb-6">Other Hospitals You May Like</h3>
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

