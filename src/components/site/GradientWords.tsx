/**
 * A title with its last word or two in the brand gradient (globals.css,
 * .lp-gradient-text) — "Find Your **Specialist**". Works on a translated
 * title too, Bangla included. `light` is for a title on a dark band.
 */
export const GradientWords = ({ text, last = 2, light = false }: { text: string; last?: number; light?: boolean }) => {
  const words = text.trim().split(/\s+/);
  const cut = Math.max(0, words.length - last);
  const head = words.slice(0, cut).join(" ");
  const tail = words.slice(cut).join(" ");
  return (
    <>
      {head && `${head} `}
      <span className={light ? "lp-gradient-text-light" : "lp-gradient-text"}>{tail}</span>
    </>
  );
};

export default GradientWords;
