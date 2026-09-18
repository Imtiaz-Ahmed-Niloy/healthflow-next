import type { ReactNode } from "react";

/**
 * The brand gradient on part of a title (globals.css, .lp-gradient-text),
 * for next-intl's t.rich: the message marks the words with <g>…</g>, so each
 * language highlights its own — "Find Your <g>Specialist</g>",
 * "আপনার <g>বিশেষজ্ঞ</g> খুঁজুন".
 *
 *   t.rich("heading", gradient)
 *   t.rich("heading", gradientLight)   // on a dark band
 */
export const gradient = {
  g: (chunks: ReactNode) => <span className="lp-gradient-text">{chunks}</span>,
};

/** The same, a few shades lighter, for a title on a dark band. */
export const gradientLight = {
  g: (chunks: ReactNode) => <span className="lp-gradient-text-light">{chunks}</span>,
};
