"use client";

import { motion } from "framer-motion";
import CountUp from "@/components/site/CountUp";
import type { HomeContent } from "@/data/homeContent";

/**
 * The numbers, on the dark band.
 *
 * The home page alternates light and dark, and this is its first dark stop:
 * the cream hero above, the specialists below, the plans further down on this
 * same surface. Gradient, glow and grid are the plans band's, deliberately —
 * two sections of one material rather than two designs.
 *
 * No panel around the figures. They are four short strings and they hold the
 * band on their own; a card here only puts a rectangle between them and the
 * surface they are meant to sit on. The rules between them separate instead.
 */
const Stats = ({ content, children }: { content: HomeContent; children?: React.ReactNode }) => {
  return (
    // Full bleed: the band runs the width of the window, so no container and no
    // corners. Only what is inside it is held to the page's column.
    <section className="relative overflow-hidden bg-gradient-dark text-surface-dark-foreground py-20 md:py-28">
      {/* Colour under the figures, so the band is lit rather than flat. Two,
          at the same strengths the plans band uses — the light version of this
          section needed four to register, which was the tell that it was
          fighting its own background. */}
      <div aria-hidden className="absolute -top-32 left-[6%] h-[26rem] w-[26rem] rounded-full bg-[hsl(152_70%_52%)]/25 blur-[120px]" />
      <div aria-hidden className="absolute -bottom-40 right-[4%] h-[30rem] w-[30rem] rounded-full bg-[hsl(199_80%_52%)]/20 blur-[130px]" />

      {/* The plans band's grid, line for line. That is the point: the two dark
          stops on this page have to be recognisably the same surface. */}
      <div
        aria-hidden
        className="absolute inset-0 [background-image:linear-gradient(hsl(0_0%_100%/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(120%_100%_at_50%_30%,black_10%,transparent_75%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_30%,black_10%,transparent_75%)]"
      />

      <div className="relative container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {content.stats.map((s, i) => (
            // A rule on every column but the first of its row. Two columns on
            // phones and four above them, so which items start a row changes
            // with the breakpoint and the borders have to change with it.
            <motion.div
              key={`${s.label}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="border-l border-white/10 px-4 py-6 text-center odd:border-l-0 md:px-6 md:odd:border-l md:[&:first-child]:border-l-0"
            >
              <div className="font-display text-4xl md:text-5xl lg:text-6xl text-accent">
                <CountUp value={s.value} />
              </div>
              <div className="mt-3 text-sm opacity-70">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Whatever the page puts in this band alongside the numbers — the
            search, today. Same column as the figures, well clear of them: it
            is the thing people came to use, not a footnote to the count. */}
        {children && <div className="mt-14 md:mt-20">{children}</div>}
      </div>
    </section>
  );
};
export default Stats;
