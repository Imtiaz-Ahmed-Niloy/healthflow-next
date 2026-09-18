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

/**
 * A CMS title with its [marked] words in the gradient (lib/markedTitle.ts).
 * A title with no brackets renders as plain text.
 */
export const GradientText = ({ text, light = false }: { text: string; light?: boolean }) => (
  <>
    {text.split(/(\[[^\]]*\])/g).map((part, i) =>
      part.startsWith("[") && part.endsWith("]")
        ? <span key={i} className={light ? "lp-gradient-text-light" : "lp-gradient-text"}>{part.slice(1, -1)}</span>
        : part,
    )}
  </>
);
