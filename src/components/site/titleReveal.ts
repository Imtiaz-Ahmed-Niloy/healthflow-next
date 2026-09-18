import type { MotionProps } from "framer-motion";

/**
 * How a landing-page section title comes in: it rises and fades in the first
 * time it scrolls into view. One definition for every page, spread onto a
 * `motion.h2` — `<motion.h2 {...titleReveal} className="…">`. The page heroes
 * animate on load instead, with their text.
 */
export const titleReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" },
} satisfies MotionProps;
