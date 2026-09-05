"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a stat up to its value the first time it scrolls into view.
 *
 * The stats are editable strings — "500+", "99.9%", "15+" — not numbers, so
 * the number is found inside the text and everything around it is kept as
 * typed. A value with no number in it ("24/7", "Nationwide") is rendered
 * untouched rather than mangled into NaN.
 *
 * Once only, and never for someone whose system asks for less motion: a figure
 * that re-animates every time it scrolls past is a distraction, and for some
 * people it is worse than that.
 *
 * The server renders the finished number, so the page reads correctly with no
 * JavaScript and there is nothing to hydrate wrongly; the count only starts
 * once the component is running in the browser.
 */

/** "99.9%" → prefix "", number 99.9, suffix "%", one decimal place. */
const parse = (value: string) => {
  const match = value.match(/-?\d[\d,]*(\.\d+)?/);
  if (!match) return null;

  const raw = match[0];
  const target = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;

  return {
    prefix: value.slice(0, match.index ?? 0),
    suffix: value.slice((match.index ?? 0) + raw.length),
    target,
    decimals: raw.split(".")[1]?.length ?? 0,
    /** Keep the thousands separators the value was written with. */
    grouped: raw.includes(","),
  };
};

const DURATION_MS = 1400;

const CountUp = ({ value, className }: { value: string; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  const parsed = parse(value);
  const target = parsed?.target ?? 0;
  const hasNumber = parsed !== null;

  const [counting, setCounting] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!hasNumber || reduceMotion) return;
    // Only now does the number drop to zero — on the server and in the first
    // client render it is already the real figure.
    setCounting(true);
  }, [hasNumber, reduceMotion]);

  useEffect(() => {
    if (!counting || !inView) return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - started) / DURATION_MS, 1);
      // Ease out: quick to begin with, settling onto the number rather than
      // stopping dead on it.
      setShown(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [counting, inView, target]);

  if (!parsed) return <span className={className}>{value}</span>;

  const n = counting ? shown : parsed.target;

  return (
    <span ref={ref} className={className}>
      {parsed.prefix}
      {n.toLocaleString("en-US", {
        minimumFractionDigits: parsed.decimals,
        maximumFractionDigits: parsed.decimals,
        useGrouping: parsed.grouped,
      })}
      {parsed.suffix}
    </span>
  );
};

export default CountUp;
