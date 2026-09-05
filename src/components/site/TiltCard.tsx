"use client";

import { motion, useReducedMotion, useSpring } from "framer-motion";

/**
 * A card that tips toward the pointer and lifts as you hover it.
 *
 * Written once and used across the site — the specialists, the hubs, the plans,
 * the testimonials, the contact channels, the about pages. Copying the pointer
 * maths into each of those was the alternative, and they would have drifted.
 *
 * Two things worth knowing before using it:
 *
 *  - It writes its own `transform`, so a CSS transform class on the same
 *    element (`hover:-translate-y-1`, `md:scale-105`) is silently overwritten.
 *    Use the `lift` and `scale` props instead; that is what they are for.
 *  - It never re-renders while the pointer moves: the rotation goes into
 *    springs, which drive the transform outside React.
 *
 * Under `prefers-reduced-motion` the tilt, the lift and the entrance all stop;
 * the card keeps whatever colour and shadow its className gives it.
 */

/** Soft enough that the card settles rather than snapping back. */
const SPRING = { stiffness: 180, damping: 18, mass: 0.4 };

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  /** Degrees at the very edge. Past about 10 it reads as a bug, not a card. */
  maxTilt?: number;
  /** Pixels the card rises on hover. 0 to keep it flat. */
  lift?: number;
  /** A resting scale — for a card that is meant to stand out from its row. */
  scale?: number;
  /** Fade-and-rise as it scrolls into view. Off when the parent does that. */
  animateIn?: boolean;
  /** Stagger, in seconds, for a row of them. */
  delay?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export const TiltCard = ({
  children,
  className = "",
  maxTilt = 8,
  lift = 6,
  scale = 1,
  animateIn = true,
  delay = 0,
  onMouseEnter,
  onMouseLeave,
}: TiltCardProps) => {
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion || maxTilt === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // The corner nearest the pointer dips towards it.
    rotateX.set((0.5 - py) * maxTilt);
    rotateY.set((px - 0.5) * maxTilt);
  };

  const settle = () => {
    rotateX.set(0);
    rotateY.set(0);
    onMouseLeave?.();
  };

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 24 } : undefined}
      whileInView={animateIn ? { opacity: 1, y: 0 } : undefined}
      viewport={animateIn ? { once: true, margin: "-60px" } : undefined}
      transition={{ duration: 0.5, delay }}
      whileHover={reduceMotion || lift === 0 ? undefined : { y: -lift }}
      onMouseMove={onMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={settle}
      style={{ rotateX, rotateY, scale, transformPerspective: 900 }}
      className={`group ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default TiltCard;
