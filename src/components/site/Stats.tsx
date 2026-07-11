"use client";

import { motion } from "framer-motion";
import { useHomeContent } from "@/data/homeContent";

const Stats = () => {
  const { content } = useHomeContent();
  return (
    <section className="container mx-auto py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {content.stats.map((s, i) => (
          <motion.div key={`${s.label}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}>
            <div className="font-display text-4xl md:text-5xl text-primary text-6xl">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-3 text-sm">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
export default Stats;

