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

export const SectionGlow = ({ wash, orbs, dots = false, fade = "both", bleed = false }: {
  wash?: "teal" | "cyan" | "emerald";
  orbs: Orb[];
  dots?: boolean;
  /** "bottom" for the hero, which starts under the navbar's own edge. */
  fade?: "both" | "bottom";
  /**
   * For a section that is itself the page's `container`: the glow spans the
   * whole window instead of stopping at the container's sides, which would
   * leave two hard vertical edges. The page wraps in `overflow-x-clip` so the
   * extra width never scrolls.
   */
  bleed?: boolean;
}) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute -z-10 overflow-hidden ${bleed ? "inset-y-0 left-1/2 w-screen -translate-x-1/2" : "inset-0"} ${wash ? WASH[wash] : ""} ${fade === "both" ? "lp-fade-y" : "lp-fade-bottom"}`}
  >
    {dots && <div className="lp-dotgrid absolute inset-0" />}
    {orbs.map((o, i) => (
      <div key={i} className={`lp-orb ${ORB[o.color]} ${DRIFT[o.drift]} ${o.className}`} />
    ))}
  </div>
);

/**
 * The homepage's glows by name, for the other public pages to reuse:
 * `<SectionGlow {...GLOW.teal} />`. `hero` is for a page's first section
 * (under the see-through navbar); the washes alternate down the page.
 */
export const GLOW = {
  hero: {
    fade: "bottom",
    dots: true,
    orbs: [
      { color: "teal", drift: "a", className: "left-[-6rem] top-[-8rem] h-[26rem] w-[26rem]" },
      { color: "cyan", drift: "b", className: "right-[-5rem] top-[-6rem] h-[24rem] w-[30rem]" },
      { color: "emerald", drift: "c", className: "left-1/3 top-[20rem] hidden h-[22rem] w-[28rem] sm:block" },
    ],
  },
  teal: {
    wash: "teal",
    dots: true,
    orbs: [
      { color: "teal", drift: "a", className: "left-[8%] top-[10%] h-[24rem] w-[30rem]" },
      { color: "cyan", drift: "b", className: "right-[8%] top-[38%] h-[22rem] w-[28rem]" },
    ],
  },
  emerald: {
    wash: "emerald",
    orbs: [{ color: "emerald", drift: "c", className: "left-[-8rem] top-10 h-[26rem] w-[40rem]" }],
  },
  cyan: {
    wash: "cyan",
    orbs: [
      { color: "cyan", drift: "b", className: "right-[-2rem] top-24 h-[22rem] w-[28rem]" },
      { color: "teal", drift: "a", className: "left-[-2rem] top-[40%] h-[18rem] w-[24rem]" },
    ],
  },
} satisfies Record<string, Parameters<typeof SectionGlow>[0]>;

export default SectionGlow;
