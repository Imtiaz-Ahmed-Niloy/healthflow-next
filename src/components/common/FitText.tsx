"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Every whole pixel size from `max` down to `min`, largest first. */
export const pxRange = (max: number, min: number) =>
  Array.from({ length: max - min + 1 }, (_, i) => max - i);

/**
 * A heading kept on one line by shrinking it: the longer the text, the
 * smaller it gets — "Prof. Dr. Md. Abdur Rahman Chowdhury" at 15px where
 * "Dr. Demo Smith" keeps 18px. It takes the largest of `sizes` that fits on
 * one line; if even the smallest does not, it wraps at that size. Never cut
 * off with an ellipsis, since a name has to be read in full.
 *
 * Measured, not guessed from the length: the width changes with the layout,
 * and Bangla and English letters are not the same width. Every check starts
 * again from the largest size, so a box that grows wider gets it back; it runs
 * again once the web fonts have loaded, since they are wider than the fallback.
 *
 * Bangla text is marked lang="bn", even on the English site, so it gets the
 * Bangla heading line height and spacing from globals.css.
 */
export const FitText = ({ as: Tag = "h3", text, sizes, className }: {
  as?: "h1" | "h2" | "h3";
  text: string;
  /** Pixel sizes to try, largest first — pxRange(18, 13), say. */
  sizes: number[];
  className?: string;
}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  // `fits` false: even the smallest size needs two lines, so let it wrap.
  const [fit, setFit] = useState({ size: sizes[0], fits: true });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // Tried on one line at each size, whatever it is showing at the moment.
      const { fontSize, whiteSpace } = el.style;
      el.style.whiteSpace = "nowrap";
      const size = sizes.find(px => {
        el.style.fontSize = `${px}px`;
        return el.scrollWidth <= el.clientWidth;
      });
      el.style.fontSize = fontSize;
      el.style.whiteSpace = whiteSpace;
      setFit(size ? { size, fits: true } : { size: sizes[sizes.length - 1], fits: false });
    };
    check();
    void document.fonts?.ready.then(check);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
    // `sizes` is compared by its contents: callers build it inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sizes.join()]);

  return (
    <Tag ref={ref} style={{ fontSize: `${fit.size}px` }} lang={/[ঀ-৿]/.test(text) ? "bn" : undefined}
      className={cn(className, fit.fits && "whitespace-nowrap")}>
      {text}
    </Tag>
  );
};

export default FitText;
