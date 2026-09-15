/**
 * The colour behind one of the landing page's light sections, after
 * prescriply.bd: an optional wash, blurred orbs that drift slowly, and a
 * faint dot grid. It sits behind the section's content (the wrapper needs
 * `relative isolate`) and fades out at its edges, so sections meet without a
 * line. The classes are in globals.css (.lp-*).
 */

export type Orb = {
  color: "teal" | "cyan" | "emerald";
  drift: "a" | "b" | "c";
  /** Where and how big — Tailwind position and size classes. */
  className: string;
};

// Written out whole: Tailwind keeps a class from globals.css only when it
// finds the full name in the code, and a name built as `lp-orb-${color}`
// never appears — the orbs came out colourless.
const ORB = { teal: "lp-orb-teal", cyan: "lp-orb-cyan", emerald: "lp-orb-emerald" } as const;
const DRIFT = { a: "lp-drift-a", b: "lp-drift-b", c: "lp-drift-c" } as const;
const WASH = { teal: "lp-wash-teal", cyan: "lp-wash-cyan", emerald: "lp-wash-emerald" } as const;

export const SectionGlow = ({ wash, orbs, dots = false, fade = "both" }: {
  wash?: "teal" | "cyan" | "emerald";
  orbs: Orb[];
  dots?: boolean;
  /** "bottom" for the hero, which starts under the navbar's own edge. */
  fade?: "both" | "bottom";
}) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${wash ? WASH[wash] : ""} ${fade === "both" ? "lp-fade-y" : "lp-fade-bottom"}`}
  >
    {dots && <div className="lp-dotgrid absolute inset-0" />}
    {orbs.map((o, i) => (
      <div key={i} className={`lp-orb ${ORB[o.color]} ${DRIFT[o.drift]} ${o.className}`} />
    ))}
  </div>
);

export default SectionGlow;
