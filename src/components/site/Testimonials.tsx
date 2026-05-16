import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTestimonials, type TestimonialAudience } from "@/data/testimonials";

const Testimonials = () => {
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<TestimonialAudience>("Patients");
  const { items } = useTestimonials();
  const labels: Record<TestimonialAudience, string> = { Patients: tr("testimonials.patients"), Doctors: tr("testimonials.doctors") };
  const visible = useMemo(() => items.filter(i => i.audience === tab), [items, tab]);
  return (
    <section className="container mx-auto py-24">
      <h2 className="text-center font-display text-3xl md:text-4xl text-primary">{tr("testimonials.heading")}</h2>
      <div className="flex justify-center mt-6">
        <div className="inline-flex rounded-full bg-muted p-1.5 gap-1">
          {(["Patients", "Doctors"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${tab === t ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>
              {labels[t]}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground mt-12">No testimonials yet.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {visible.map((r, i) => (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-3xl bg-card border border-border/60 p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <img src={r.img} alt={r.name} width={48} height={48} loading="lazy" className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-primary">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </div>
              <p className="mt-4 text-foreground/80 leading-relaxed italic text-justify text-xs">"{r.text}"</p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};
export default Testimonials;
