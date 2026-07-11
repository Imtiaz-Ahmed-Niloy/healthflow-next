"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
const hero = "/assets/hero-clinic.jpg";
import { useHomeContent } from "@/data/homeContent";

const Hero = () => {
  const { content } = useHomeContent();
  return (
    <section className="container mx-auto pt-12 pb-20 lg:pt-20 lg:pb-28">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="mt-6 font-display md:text-6xl lg:text-7xl leading-[1.05] text-primary text-balance text-4xl">
            {content.heroTitle1}
            {content.heroTitle2 && (
              <> {" "}<span className="italic text-primary-glow text-4xl">{content.heroTitle2}</span></>
            )}
          </h1>
          <p className="mt-6 text-base text-muted-foreground max-w-xl leading-relaxed md:text-base text-justify">
            {content.heroDesc}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/patient/find-doctors" className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-all hover:shadow-card">
              {content.heroBookCta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/hospitals" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-primary hover:bg-muted transition-colors">
              {content.heroExploreCta}
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative"
        >
          <img src={hero} alt="Modern restorative clinical room" width={1280} height={1024}
            className="rounded-[2rem] w-full aspect-[4/3] object-cover shadow-card" />
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-accent/40 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
};
export default Hero;

