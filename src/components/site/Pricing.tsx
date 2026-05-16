import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePricing } from "@/hooks/usePricing";

const Pricing = () => {
  const { t } = useTranslation();
  const { plans } = usePricing();
  return (
    <section id="pricing" className="bg-gradient-dark text-surface-dark-foreground py-24 mt-12">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display md:text-5xl text-7xl">{t("pricing.heading")}</h2>
          <p className="opacity-70 mt-3 text-sm">{t("pricing.subheading")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p, i) => (
            <motion.div key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`rounded-3xl p-8 relative ${p.featured ? "bg-card text-foreground shadow-glow scale-100 md:scale-105" : "bg-surface-dark/40 border border-surface-dark-foreground/10"}`}>
              {p.featured && <span className="absolute top-6 right-6 rounded-full bg-accent text-primary px-3 py-1 text-[10px] font-bold tracking-wide">{t("pricing.recommended")}</span>}
              <h3 className={`font-display text-2xl ${p.featured ? "text-primary" : ""}`}>{p.name}</h3>
              <p className={`text-sm mt-1 ${p.featured ? "text-muted-foreground" : "opacity-70"}`}>{p.tag}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-5xl">${p.price}</span>
                <span className={`text-sm ${p.featured ? "text-muted-foreground" : "opacity-60"}`}>/month</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map(f => (
                  <li key={f.text} className={`flex items-start gap-2 text-sm ${f.on ? "" : "line-through opacity-50"}`}>
                    {f.on
                      ? <Check className={`h-4 w-4 mt-0.5 shrink-0 ${p.featured ? "text-primary-glow" : "text-accent"}`} />
                      : <X className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />}
                    <span className={p.featured ? "text-foreground/80" : "opacity-80"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className={`mt-8 block text-center w-full rounded-full py-3 text-sm font-semibold transition-all ${p.featured ? "bg-primary text-primary-foreground hover:bg-primary-glow" : "border border-surface-dark-foreground/30 hover:bg-surface-dark-foreground/10"}`}>
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Pricing;
