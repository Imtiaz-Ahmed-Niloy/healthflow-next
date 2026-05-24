'use client';
import Hero from "@/components/site/Hero";
import SearchBar from "@/components/site/SearchBar";
import Specialists from "@/components/site/Specialists";
import Stats from "@/components/site/Stats";
import Hubs from "@/components/site/Hubs";
import Pricing from "@/components/site/Pricing";
import Testimonials from "@/components/site/Testimonials";
import Chatbot from "@/components/site/Chatbot";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      
        <Hero />
        <SearchBar />
        <Specialists />
        <Stats />
        <Hubs />
        <Pricing />
        <Testimonials />
      <Chatbot />
      
    </div>
  );
};

export default Index;
