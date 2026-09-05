"use client";

import { useState, useRef } from "react";
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
import type { HomeContent } from "@/data/homeContent";
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
  const [division, setDivision] = useState("");
  const [zilla, setZilla] = useState("");
  const [upazila, setUpazila] = useState("");
  const [specialty, setSpecialty] = useState("");
  const specialistsRef = useRef<HTMLElement>(null);

  const scrollToSpecialists = () => {
    specialistsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main>
        <Hero content={homeContent} />
        {/* The search sits inside the dark band, under the numbers — it is the
            one thing on this page people came to do. */}
        <Stats content={homeContent}>
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
        </Stats>
        <Specialists
          ref={specialistsRef}
          division={division}
          zilla={zilla}
          upazila={upazila}
          specialty={specialty}
        />
        <Hubs />
        <Pricing plans={pricingPlans} />
        <Testimonials />
      </main>
      <Footer />
      <Chatbot />
      <AnnouncementPopup announcements={announcements} />
    </div>
  );
};

export default Index;

