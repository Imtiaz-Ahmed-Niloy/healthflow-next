'use client';
import { motion } from "framer-motion";
import { Filter, Map, Star, Calendar, MapPin, Video, Award, Search, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import doctor1 from "@/assets/doctor-1.jpg";
import doctorAvatar from "@/assets/doctor-avatar.jpg";
import patientSarah from "@/assets/patient-sarah.jpg";
import patientEleanor from "@/assets/patient-eleanor.jpg";

const cats = ["All Specialties", "Cardiology", "Neurology", "Dermatology", "Pediatrics", "Psychiatry", "Oncology"];

const featured = [
  { name: "Dr. Aris Thorne", role: "Senior Cardiologist", rating: "4.9", reviews: "124 reviews", img: doctor1, slot: "Tomorrow, 09:00 AM", loc: "South Wing", loc_icon: MapPin, starred: true },
  { name: "Dr. Elena Vance", role: "Neurobiology Expert", rating: "4.8", reviews: "89 reviews", img: patientSarah, slot: "May 12th, 14:30 PM", loc: "Telehealth", loc_icon: Video },
  { name: "Dr. Julian Marsh", role: "Pediatric Care", rating: "5.0", reviews: "210 reviews", img: doctorAvatar, slot: "Today, 16:00 PM", loc: "Green Pavilion", loc_icon: MapPin },
];

const second = [
  { name: "Dr. Michael Chang", role: "Sports Medicine", rating: "4.7", reviews: "64 reviews", img: doctorAvatar, slot: "Next Mon, 11:30 AM", loc: "Rehab Unit", loc_icon: MapPin },
  { name: "Dr. Sophia Patel", role: "Dermatology", rating: "4.9", reviews: "152 reviews", img: patientEleanor, slot: "Today, 14:00 PM", loc: "Skin Clinic", loc_icon: MapPin },
];

const list = [
  { name: "Dr. Maria Lopez", role: "Internal Medicine", exp: "10 Years Exp.", rating: "4.7 (120)", price: "$120.00", img: patientSarah },
  { name: "Dr. David Grant", role: "Neurology", exp: "18 Years Exp.", rating: "4.9 (430)", price: "$210.00", img: doctor1, urgent: true },
  { name: "Dr. Sarah Kim", role: "Endocrinology", exp: "6 Years Exp.", rating: "4.6 (56)", price: "$140.00", img: patientEleanor },
];

const matchesQuery = (q: string, ...fields: string[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some(f => f.toLowerCase().includes(s));
};

const FindDoctors = () => {
  const [cat, setCat] = useState(0);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const activeCat = cats[cat];
  const inCat = (role: string) => activeCat === "All Specialties" || role.toLowerCase().includes(activeCat.toLowerCase());

  const featuredVisible = featured.filter(d => inCat(d.role) && matchesQuery(query, d.name, d.role, d.loc));
  const secondVisible = second.filter(d => inCat(d.role) && matchesQuery(query, d.name, d.role, d.loc));
  const listVisible = list.filter(d => inCat(d.role) && matchesQuery(query, d.name, d.role, d.exp));
  const totalVisible = featuredVisible.length + secondVisible.length + listVisible.length;

  return (
    <PatientPortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl text-primary">Find Your Specialist</h1>
          <p className="text-sm text-muted-foreground mt-3">Connect with world-class medical professionals in our ecosystem of sustainable, patient-centric care.</p>
        </div>
      </div>

      <div className="mt-6 relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by doctor name, specialty or location..."
          className="w-full rounded-full bg-card border border-border pl-11 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow"
          aria-label="Search doctors"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-chip flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {query && (
          <p className="text-xs text-muted-foreground mt-2 ml-2">{totalVisible} match{totalVisible === 1 ? "" : "es"} for "{query}"</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {cats.map((c, i) => (
          <button key={c} onClick={() => setCat(i)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${cat === i ? "bg-gradient-dark text-surface-dark-foreground shadow-glow" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}>{c}</button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {featuredVisible.map((d, i) => (
          <motion.div key={d.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft relative">
            {d.starred && <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Star className="h-4 w-4 fill-current" /></div>}
            <div className="flex gap-4">
              <img src={typeof (d.img) === "string" ? (d.img) : ((d.img)?.src ?? "")} alt={d.name} loading="lazy" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-primary">{d.name}</p>
                <p className="text-xs text-primary-glow font-semibold">{d.role}</p>
                <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" /> {d.rating} <span className="text-muted-foreground">({d.reviews})</span></p>
              </div>
            </div>
            <p className="text-xs text-foreground/70 mt-4">Specializing in advanced diagnostic procedures and patient-centric long-term care plans.</p>
            <div className="flex gap-2 mt-4">
              <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><Calendar className="h-3 w-3" /> {d.slot}</span>
              <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><d.loc_icon className="h-3 w-3" /> {d.loc}</span>
            </div>
            <Link href={`/doctors/${slugify(d.name)}`} className="mt-5 block text-center w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-2.5 text-sm font-semibold shadow-glow hover:opacity-90">Book Appointment</Link>
          </motion.div>
        ))}
      </div>

      {/* Featured */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-2 mt-8 rounded-3xl overflow-hidden bg-gradient-dark text-surface-dark-foreground shadow-glow">
        <div className="p-10">
          <p className="text-[10px] tracking-widest font-bold opacity-80">FEATURED SPECIALIST</p>
          <h2 className="font-display text-4xl mt-3">Personalized Care with Dr. Sarah Liao</h2>
          <p className="text-sm opacity-80 mt-4">Voted Physician of the Year 2023, Dr. Liao is revolutionizing integrative medicine by combining modern diagnostic precision with traditional healing wisdom.</p>
          <div className="flex gap-3 mt-6">
            <Link href="/doctors/dr-sarah-liao" className="rounded-full bg-card text-primary px-6 py-3 text-sm font-semibold hover:opacity-90">Explore Biography</Link>
            <Link href="/telehealth" className="rounded-full border border-surface-dark-foreground/30 px-6 py-3 text-sm font-semibold hover:bg-surface-dark-foreground/10">Virtual Consultation</Link>
          </div>
        </div>
        <div className="bg-chip relative min-h-[280px]">
          <img src={typeof (patientSarah) === "string" ? (patientSarah) : ((patientSarah)?.src ?? "")} alt="Dr. Sarah Liao" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 mt-8">
        {secondVisible.map((d, i) => (
          <motion.div key={d.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }} className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
            <div className="flex gap-4">
              <img src={typeof (d.img) === "string" ? (d.img) : ((d.img)?.src ?? "")} alt={d.name} loading="lazy" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-primary">{d.name}</p>
                <p className="text-xs text-primary-glow font-semibold">{d.role}</p>
                <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" /> {d.rating} <span className="text-muted-foreground">({d.reviews})</span></p>
              </div>
            </div>
            <p className="text-xs text-foreground/70 mt-4">Expert in patient recovery and integrative wellness. Lead consultant for restorative care.</p>
            <div className="flex gap-2 mt-4">
              <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><Calendar className="h-3 w-3" /> {d.slot}</span>
              <span className="flex items-center gap-1 text-xs bg-chip rounded-full px-3 py-1.5 text-primary"><d.loc_icon className="h-3 w-3" /> {d.loc}</span>
            </div>
            <Link href={`/doctors/${slugify(d.name)}`} className="mt-5 block text-center w-full rounded-full bg-gradient-dark text-surface-dark-foreground py-2.5 text-sm font-semibold shadow-glow hover:opacity-90">Book Appointment</Link>
          </motion.div>
        ))}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-2xl bg-chip/60 p-6">
          <h3 className="font-display text-xl text-primary">Network Reach</h3>
          <p className="text-xs text-foreground/70 mt-2">Our living laboratory spans across multiple campuses for integrated healing.</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            {[
              { v: "450+", l: "SPECIALISTS" }, { v: "12", l: "CAMPUSES" },
              { v: "98%", l: "SATISFACTION" }, { v: "24/7", l: "SUPPORT" },
            ].map(s => (
              <div key={s.l} className="rounded-xl bg-card p-3 text-center">
                <p className="font-display text-2xl text-primary">{s.v}</p>
                <p className="text-[9px] tracking-widest font-bold text-primary-glow mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-primary">Available Specialists</h2>
          <p className="text-sm text-muted-foreground">Showing {listVisible.length} Specialist{listVisible.length === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-5 space-y-3">
          {listVisible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">No specialists match your search.</div>
          )}
          {listVisible.map((d, i) => (
            <motion.div key={d.name} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className={`rounded-2xl bg-card border ${d.urgent ? "border-l-4 border-l-destructive border-y-border/60 border-r-border/60" : "border-border/60"} p-4 flex items-center gap-5 shadow-soft`}>
              <img src={typeof (d.img) === "string" ? (d.img) : ((d.img)?.src ?? "")} alt={d.name} loading="lazy" width={48} height={48} className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-primary text-sm">{d.name}</p>
                  {d.urgent && <span className="rounded-full bg-destructive/15 text-destructive text-[9px] tracking-widest font-bold px-2 py-0.5">URGENT</span>}
                </div>
                <p className="text-xs text-primary-glow font-semibold">{d.role}</p>
              </div>
              <p className="text-sm text-foreground/70 hidden md:block">{d.exp}</p>
              <p className="text-xs text-foreground/70 hidden md:flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" /> {d.rating}</p>
              <p className="font-semibold text-primary ml-auto">{d.price}</p>
              <Link href={`/doctors/${slugify(d.name)}`} className="text-[10px] tracking-widest font-bold text-primary-glow hover:underline hidden sm:block">VIEW PROFILE</Link>
              <Link href={`/doctors/${slugify(d.name)}`} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-5 py-2 text-xs font-semibold shadow-glow">Book</Link>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => toast.success("Loading more specialists")} className="rounded-full bg-chip border border-border px-6 py-3 text-sm font-semibold text-primary hover:bg-chip/70 transition-colors">Load More Specialists</button>
        </div>
      </div>
    </PatientPortalLayout>
  );
};
export default FindDoctors;
