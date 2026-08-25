export type StatItem = { value: string; label: string };

export type HomeContent = {
  heroTitle1: string;
  heroTitle2: string;
  heroDesc: string;
  heroBookCta: string;
  heroExploreCta: string;
  stats: StatItem[];
};

export const defaultHomeContent: HomeContent = {
  heroTitle1: "Your Health, Connected in One Place.",
  heroTitle2: "",
  heroDesc:
    "Find trusted hospitals, clinics, doctors, diagnostics, and pharmacies — all in one powerful platform designed for your complete healthcare journey. Book appointments. Compare services. Access reports. Order medicines. Get better care — faster, smarter.",
  heroBookCta: "Book a Consultation",
  heroExploreCta: "Explore Hubs",
  stats: [
    { value: "500+", label: "Health Specialists" },
    { value: "300+", label: "Patients Served" },
    { value: "99.9%", label: "Satisfaction Rate\u00a0" },
    { value: "15+", label: "Verified Health Hubs" },
  ],
};

type HomeBlocks = {
  hero?: {
    title1?: string;
    title2?: string;
    desc?: string;
    bookCta?: string;
    exploreCta?: string;
  };
  stats?: {
    items?: StatItem[];
  };
};

export const blocksToHomeContent = (blocks: unknown): HomeContent => {
  const b = (blocks ?? {}) as HomeBlocks;
  return {
    heroTitle1:     b.hero?.title1     ?? defaultHomeContent.heroTitle1,
    heroTitle2:     b.hero?.title2     ?? defaultHomeContent.heroTitle2,
    heroDesc:       b.hero?.desc       ?? defaultHomeContent.heroDesc,
    heroBookCta:    b.hero?.bookCta    ?? defaultHomeContent.heroBookCta,
    heroExploreCta: b.hero?.exploreCta ?? defaultHomeContent.heroExploreCta,
    stats:          b.stats?.items     ?? defaultHomeContent.stats,
  };
};

export const homeContentToBlocks = (content: HomeContent) => {
  return {
    hero: {
      title1:     content.heroTitle1,
      title2:     content.heroTitle2,
      desc:       content.heroDesc,
      bookCta:    content.heroBookCta,
      exploreCta: content.heroExploreCta,
    },
    stats: { items: content.stats },
  };
};
