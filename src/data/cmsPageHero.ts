import type { Locale } from "@/i18n/config";
import { blocksFor } from "@/data/cmsLocale";
import { withDefaultMarks } from "@/lib/markedTitle";

export type CmsHeroKey = "features" | "about" | "contact";

export type CmsHeroFields = {
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

export type CmsHeroContent = Record<CmsHeroKey, CmsHeroFields>;

export const defaultCmsHero: CmsHeroContent = {
  features: {
    title: "Crafting the [Precision Medicine] Operating System",
    description:
      "A unified ecosystem designed to bridge the gap between clinical data and patient outcomes through biophilic interface design and AI-driven insights.",
    primaryCta: "REQUEST DEMO",
    secondaryCta: "▶ WATCH WALKTHROUGH",
  },
  about: {
    title: "Restoring Clarity to [Healthcare]",
    description:
      "We believe that medical technology should feel as natural as the care it facilitates. HealthFlow was born from a vision to simplify complex systems through organic design.",
    primaryCta: "",
    secondaryCta: "",
  },
  contact: {
    title: "Restorative support, [whenever you need it.]",
    description:
      "Our team is here to ensure your journey with HealthFlow is seamless. Reach out for medical inquiries, technical support, or to learn more about our restorative care philosophy.",
    primaryCta: "",
    secondaryCta: "",
  },
};

/** The same heroes in Bangla — what a Bangla visitor sees until the CMS has its own. */
export const defaultCmsHeroBn: CmsHeroContent = {
  features: {
    title: "[প্রিসিশন মেডিসিনের] অপারেটিং সিস্টেম তৈরি করছি",
    description:
      "ক্লিনিক্যাল তথ্য ও রোগীর ফলাফলের মধ্যে দূরত্ব কমাতে তৈরি একটি সমন্বিত ব্যবস্থা — প্রকৃতি-অনুপ্রাণিত ইন্টারফেস ডিজাইন ও এআই-চালিত বিশ্লেষণের মাধ্যমে।",
    primaryCta: "ডেমো চান",
    secondaryCta: "▶ ওয়াকথ্রু দেখুন",
  },
  about: {
    title: "স্বাস্থ্যসেবায় [স্বচ্ছতা] ফিরিয়ে আনছি",
    description:
      "আমরা বিশ্বাস করি, চিকিৎসা প্রযুক্তি তার সেবার মতোই সহজ ও স্বাভাবিক হওয়া উচিত। জটিল ব্যবস্থাকে সহজ করার স্বপ্ন থেকেই HealthFlow-এর জন্ম।",
    primaryCta: "",
    secondaryCta: "",
  },
  contact: {
    title: "যখনই দরকার, [পাশে আছি।]",
    description:
      "HealthFlow-এর সাথে আপনার যাত্রা যেন নির্বিঘ্ন হয়, সেজন্য আমাদের টিম সবসময় প্রস্তুত। চিকিৎসা-সংক্রান্ত প্রশ্ন, কারিগরি সহায়তা বা আমাদের সম্পর্কে আরও জানতে যোগাযোগ করুন।",
    primaryCta: "",
    secondaryCta: "",
  },
};

type HeroBlocks = { hero?: Partial<CmsHeroFields> };

export const defaultHeroFor = (pageKey: CmsHeroKey, locale: Locale): CmsHeroFields =>
  (locale === "bn" ? defaultCmsHeroBn : defaultCmsHero)[pageKey];

export const blocksToHero = (blocks: unknown, pageKey: CmsHeroKey, locale: Locale = "en"): CmsHeroFields => {
  const b = blocksFor(blocks, locale) as HeroBlocks;
  const fallback = defaultHeroFor(pageKey, locale);
  return {
    title: withDefaultMarks(b.hero?.title ?? fallback.title, fallback.title),
    description: b.hero?.description ?? fallback.description,
    primaryCta: b.hero?.primaryCta ?? fallback.primaryCta,
    secondaryCta: b.hero?.secondaryCta ?? fallback.secondaryCta,
  };
};

export const heroToBlocks = (hero: CmsHeroFields) => ({ hero });
