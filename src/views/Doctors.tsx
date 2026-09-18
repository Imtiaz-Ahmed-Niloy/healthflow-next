"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SectionGlow, { GLOW } from "@/components/site/SectionGlow";
import { gradient } from "@/components/site/GradientWords";
import { DoctorFinder } from "@/components/site/DoctorFinder";
import { useDoctors } from "@/hooks/useDoctors";
import { useSpecialties } from "@/hooks/useSpecialties";

/**
 * The public doctor directory. The search and filters are the patient
 * portal's own (DoctorFinder), so both places find doctors the same way; the
 * cards here keep their default button, the doctor's profile.
 */
const Doctors = () => {
  const t = useTranslations("directory");
  const { doctors, loading } = useDoctors();
  // The specialties list (0093) — the one a doctor's specialty is picked from.
  const { specialties } = useSpecialties();

  return (
    // The homepage's surface: its page colour and hero glow, and the brand
    // gradient on part of the title.
    <div className="min-h-screen lp-page-bg overflow-x-clip">
      <Navbar transparentAtTop />
      {/* At least a screen tall, so the footer stays below the fold while the
          doctors load instead of riding up under the spinner. Pulled up under
          the see-through navbar (5rem) and padded back down, as on the
          homepage. */}
      <main className="relative isolate container mx-auto min-h-screen -mt-20 pt-36 pb-16">
        <SectionGlow {...GLOW.hero} bleed />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all mb-6">
            <ArrowLeft className="h-4 w-4" /> {t("backHome")}
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl text-primary">{t.rich("doctorsTitle", gradient)}</h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              {specialties.length ? t("doctorsSubtitle", { count: specialties.length }) : t("doctorsSubtitleAll")}
            </p>
          </div>

          <DoctorFinder
            doctors={doctors}
            loading={loading}
            gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Doctors;
