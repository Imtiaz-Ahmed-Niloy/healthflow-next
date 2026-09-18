import type { Locale } from "@/i18n/config";

export type StatItem = { value: string; label: string };

/** The words of the hero, in one language. */
export type HomeText = {
  heroTitle1: string;
  heroTitle2: string;
  heroDesc: string;
  heroBookCta: string;
  heroExploreCta: string;
};

/** What the hero and the stats band render: the hero's words and the four figures. */
export type HomeCopy = HomeText & { stats: StatItem[] };

/**
 * The homepage as the CMS stores it (cms_pages, slug "home").
 *
 * English is the base: the hero's words and the stats. `bn` is the same hero
 * in Bangla, plus a label for each stat — the figures themselves are shared,
 * so "500+" is typed once and cannot drift between the two languages.
 */
export type HomeContent = HomeCopy & {
  bn: HomeText & { statLabels: string[] };
};

export const defaultHomeContent: HomeContent = {
  // The newline is deliberate: "Connected in One Place." reads as one
  // phrase and is kept on one line. Hero renders it with whitespace-pre-line.
  heroTitle1: "Your Health,\nConnected in One Place.",
  heroTitle2: "",
  heroDesc:
    "Find trusted hospitals, clinics, doctors, diagnostics, and pharmacies — all in one powerful platform designed for your complete healthcare journey. Book appointments. Compare services. Access reports. Order medicines. Get better care — faster, smarter.",
  heroBookCta: "Book a Consultation",
  heroExploreCta: "Explore Hubs",
  stats: [
    { value: "500+", label: "Health Specialists" },
    { value: "300+", label: "Patients Served" },
    { value: "99.9%", label: "Satisfaction Rate " },
    { value: "15+", label: "Verified Health Hubs" },
  ],
  bn: {
    heroTitle1: "আপনার স্বাস্থ্যসেবা,\nএক জায়গায় সংযুক্ত।",
    heroTitle2: "",
    heroDesc:
      "বিশ্বস্ত হাসপাতাল, ক্লিনিক, ডাক্তার, ডায়াগনস্টিক ও ফার্মেসি খুঁজুন — আপনার সম্পূর্ণ স্বাস্থ্যসেবার জন্য তৈরি একটি শক্তিশালী প্ল্যাটফর্মে। অ্যাপয়েন্টমেন্ট বুক করুন। সেবা তুলনা করুন। রিপোর্ট দেখুন। ওষুধ অর্ডার করুন। আরও দ্রুত, আরও স্মার্টভাবে ভালো সেবা পান।",
    heroBookCta: "পরামর্শ বুক করুন",
    heroExploreCta: "হাব ঘুরে দেখুন",
    statLabels: ["স্বাস্থ্য বিশেষজ্ঞ", "সেবা পাওয়া রোগী", "সন্তুষ্টির হার", "যাচাইকৃত হেলথ হাব"],
  },
};

type HeroBlock = {
  title1?: string;
  title2?: string;
  desc?: string;
  bookCta?: string;
  exploreCta?: string;
};

type HomeBlocks = {
  hero?: HeroBlock;
  stats?: {
    items?: StatItem[];
  };
  /** Added with the Bangla site. A row saved before it has none, and gets the default Bangla. */
  bn?: {
    hero?: HeroBlock;
    statLabels?: string[];
  };
};

const heroText = (hero: HeroBlock | undefined, fallback: HomeText): HomeText => ({
  heroTitle1:     hero?.title1     ?? fallback.heroTitle1,
  heroTitle2:     hero?.title2     ?? fallback.heroTitle2,
  heroDesc:       hero?.desc       ?? fallback.heroDesc,
  heroBookCta:    hero?.bookCta    ?? fallback.heroBookCta,
  heroExploreCta: hero?.exploreCta ?? fallback.heroExploreCta,
});

const heroBlock = (text: HomeText): HeroBlock => ({
  title1:     text.heroTitle1,
  title2:     text.heroTitle2,
  desc:       text.heroDesc,
  bookCta:    text.heroBookCta,
  exploreCta: text.heroExploreCta,
});

export const blocksToHomeContent = (blocks: unknown): HomeContent => {
  const b = (blocks ?? {}) as HomeBlocks;
  return {
    ...heroText(b.hero, defaultHomeContent),
    stats: b.stats?.items ?? defaultHomeContent.stats,
    bn: {
      ...heroText(b.bn?.hero, defaultHomeContent.bn),
      statLabels: b.bn?.statLabels ?? defaultHomeContent.bn.statLabels,
    },
  };
};

export const homeContentToBlocks = (content: HomeContent) => {
  return {
    hero: heroBlock(content),
    stats: { items: content.stats },
    bn: {
      hero: heroBlock(content.bn),
      statLabels: content.bn.statLabels,
    },
  };
};

/**
 * The homepage in one language. Bangla takes its words from `bn`; a stat with
 * no Bangla label yet shows the English one rather than nothing.
 */
export const homeCopyFor = (content: HomeContent, locale: Locale): HomeCopy => {
  if (locale !== "bn") return content;
  const { statLabels, ...text } = content.bn;
  return {
    ...text,
    stats: content.stats.map((s, i) => ({ value: s.value, label: statLabels[i]?.trim() || s.label })),
  };
};
