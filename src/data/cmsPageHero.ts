export type CmsHeroKey = "features" | "about" | "contact";

export type CmsHeroFields = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

export type CmsHeroContent = Record<CmsHeroKey, CmsHeroFields>;

export const defaultCmsHero: CmsHeroContent = {
  features: {
    eyebrow: "PLATFORM",
    title: "Crafting the Precision Medicine Operating System",
    description:
      "A unified ecosystem designed to bridge the gap between clinical data and patient outcomes through biophilic interface design and AI-driven insights.",
    primaryCta: "REQUEST DEMO",
    secondaryCta: "▶ WATCH WALKTHROUGH",
  },
  about: {
    eyebrow: "OUR STORY",
    title: "Restoring Clarity to Healthcare",
    description:
      "We believe that medical technology should feel as natural as the care it facilitates. HealthFlow was born from a vision to simplify complex systems through organic design.",
    primaryCta: "",
    secondaryCta: "",
  },
  contact: {
    eyebrow: "GET IN TOUCH",
    title: "Restorative support, whenever you need it.",
    description:
      "Our team is here to ensure your journey with HealthFlow is seamless. Reach out for medical inquiries, technical support, or to learn more about our restorative care philosophy.",
    primaryCta: "",
    secondaryCta: "",
  },
};

type HeroBlocks = { hero?: Partial<CmsHeroFields> };

export const blocksToHero = (blocks: unknown, pageKey: CmsHeroKey): CmsHeroFields => {
  const b = (blocks ?? {}) as HeroBlocks;
  const fallback = defaultCmsHero[pageKey];
  return {
    eyebrow: b.hero?.eyebrow ?? fallback.eyebrow,
    title: b.hero?.title ?? fallback.title,
    description: b.hero?.description ?? fallback.description,
    primaryCta: b.hero?.primaryCta ?? fallback.primaryCta,
    secondaryCta: b.hero?.secondaryCta ?? fallback.secondaryCta,
  };
};

export const heroToBlocks = (hero: CmsHeroFields) => ({ hero });
