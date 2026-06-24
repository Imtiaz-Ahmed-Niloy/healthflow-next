'use client';
import { useState, useRef } from "react";
import Hero from "@/components/site/Hero";
import SearchBar from "@/components/site/SearchBar";
import Specialists from "@/components/site/Specialists";
import Stats from "@/components/site/Stats";
import Hubs from "@/components/site/Hubs";
import Pricing from "@/components/site/Pricing";
import Testimonials from "@/components/site/Testimonials";
import Chatbot from "@/components/site/Chatbot";
import AnnouncementPopup from "@/components/site/AnnouncementPopup";

const Index = () => {
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
      <main>
        <Hero />
        <Stats />
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
        <Hubs />
        <Pricing />
        <Testimonials />
      </main>
      <Chatbot />
      <AnnouncementPopup />
    </div>
  );
};

export default Index;


