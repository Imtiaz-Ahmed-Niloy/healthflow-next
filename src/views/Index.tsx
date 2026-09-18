"use client";

import { useState, useRef } from "react";
import { useLocale } from "next-intl";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import SearchBar from "@/components/site/SearchBar";
import Specialists from "@/components/site/Specialists";
import Stats from "@/components/site/Stats";
import Hubs from "@/components/site/Hubs";
import Pricing from "@/components/site/Pricing";
import Testimonials from "@/components/site/Testimonials";
import Footer from "@/components/site/Footer";
import Chatbot from "@/components/site/Chatbot";
import AnnouncementPopup from "@/components/site/AnnouncementPopup";
import SectionGlow from "@/components/site/SectionGlow";
import { homeCopyFor, type HomeContent } from "@/data/homeContent";
import type { Locale } from "@/i18n/config";
import type { PricingPlan } from "@/data/pricingContent";
import type { Announcement } from "@/data/announcements";

const Index = ({
  homeContent,
  pricingPlans,
  announcements,
}: {
  homeContent: HomeContent;
  pricingPlans: PricingPlan[];
  announcements: Announcement[];
}) => {
  // The CMS keeps the hero and stats in both languages; show the visitor's.
  const homeCopy = homeCopyFor(homeContent, useLocale() as Locale);
  const [division, setDivision] = useState("");
  const [zilla, setZilla] = useState("");
  const [upazila, setUpazila] = useState("");
  const [specialty, setSpecialty] = useState("");
  const specialistsRef = useRef<HTMLElement>(null);

  const scrollToSpecialists = () => {
    specialistsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen lp-page-bg">
      <Navbar transparentAtTop />
      <main>
        {/* The light sections each sit on prescriply.bd-style colour
            (SectionGlow); the dark bands keep their own background. */}
        {/* Pulled up under the navbar (5rem), which is see-through at the
            top of the page, so the hero's colour starts at the very top. */}
        <div className="relative isolate -mt-20 pt-20">
          <SectionGlow
            fade="bottom"
            dots
            orbs={[
              { color: "teal", drift: "a", className: "left-[-6rem] top-[-8rem] h-[26rem] w-[26rem]" },
              { color: "cyan", drift: "b", className: "right-[-5rem] top-[-6rem] h-[24rem] w-[30rem]" },
              { color: "emerald", drift: "c", className: "left-1/3 top-[20rem] hidden h-[22rem] w-[28rem] sm:block" },
            ]}
          />
          <Hero content={homeCopy} />
        </div>
        <Stats content={homeCopy} />
        {/* The search sits on the light surface under the dark band, right
            above the specialists it filters. */}
        <div className="relative isolate">
          <SectionGlow
            wash="teal"
            dots
            orbs={[
              { color: "teal", drift: "a", className: "left-[8%] top-[10%] h-[24rem] w-[30rem]" },
              { color: "cyan", drift: "b", className: "right-[8%] top-[38%] h-[22rem] w-[28rem]" },
            ]}
          />
          <SearchBar
            division={division}
            zilla={zilla}
            upazila={upazila}
            specialty={specialty}
            onDivisionChange={(v) => { setDivision(v); setZilla(""); setUpazila(""); scrollToSpecialists(); }}
            onZillaChange={(v) => { setZilla(v); setUpazila(""); scrollToSpecialists(); }}
            onUpazilaChange={(v) => { setUpazila(v); scrollToSpecialists(); }}
            onSpecialtyChange={(v) => { setSpecialty(v); scrollToSpecialists(); }}
            onClear={() => { setDivision(""); setZilla(""); setUpazila(""); setSpecialty(""); }}
          />
          <Specialists
            ref={specialistsRef}
            division={division}
            zilla={zilla}
            upazila={upazila}
            specialty={specialty}
          />
        </div>
        <div className="relative isolate">
          <SectionGlow
            wash="emerald"
            orbs={[{ color: "emerald", drift: "c", className: "left-[-8rem] top-10 h-[26rem] w-[40rem]" }]}
          />
          <Hubs />
        </div>
        <Pricing plans={pricingPlans} />
        <div className="relative isolate">
          <SectionGlow
            wash="cyan"
            orbs={[
              { color: "cyan", drift: "b", className: "right-[-2rem] top-24 h-[22rem] w-[28rem]" },
              { color: "teal", drift: "a", className: "left-[-2rem] top-[40%] h-[18rem] w-[24rem]" },
            ]}
          />
          <Testimonials />
        </div>
      </main>
      <Footer />
      <Chatbot />
      <AnnouncementPopup announcements={announcements} />
    </div>
  );
};

export default Index;

