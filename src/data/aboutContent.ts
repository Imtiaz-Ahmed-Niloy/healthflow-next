import type { Locale } from "@/i18n/config";
import { blocksFor } from "@/data/cmsLocale";
import { withDefaultMarks } from "@/lib/markedTitle";

export type Pillar = { icon: string; title: string; desc: string };
export type TeamMember = { name: string; role: string; img?: string };
export type Stat = { value: string; label: string };
export type JourneyStep = { year: string; title: string; desc: string };
export type CoreObjective = { icon: string; title: string; desc: string };

export type AboutContent = {
  pillars: { title: string; items: Pillar[] };
  team: { title: string; subtitle: string; members: TeamMember[] };
  stats: Stat[];
  journey: { title: string; subtitle: string; steps: JourneyStep[] };
  ceoMessage: { quote: string; attributionLead: string; attributionName: string };
  vision: { eyebrow: string; title: string; statement: string };
  mission: { eyebrow: string; title: string; statement: string };
  objectives: { title: string; subtitle: string; items: CoreObjective[] };
};

export const defaultAboutContent: AboutContent = {
  pillars: {
    title: "Foundational [Pillars]",
    items: [
      { icon: "Leaf", title: "Organic Growth", desc: "Systems that evolve naturally with your practice, ensuring longevity and adaptability in a shifting medical landscape." },
      { icon: "HeartPulse", title: "Patient-First Precision", desc: "Every line of code is written with the patient experience in mind, prioritizing restorative outcomes over processing speed." },
      { icon: "ShieldCheck", title: "Unwavering Integrity", desc: "Security and compliance aren't just features; they are the bedrock of the trust we build with providers and patients alike." },
    ],
  },
  team: {
    title: "The Visionaries",
    subtitle: "Meet the multidisciplinary team bridging the gap between clinical excellence and digital innovation.",
    members: [
      { name: "Dr. Elena Thorne", role: "Chief Medical Officer" },
      { name: "Marcus Vane", role: "Head of Product Design" },
      { name: "Julian Chen", role: "CTO & Founder" },
      { name: "Sarah Jenkins", role: "VP of Operations" },
    ],
  },
  stats: [
    { value: "500+", label: "Clinics Empowered" },
    { value: "1M+", label: "Patients Served" },
    { value: "99.9%", label: "Uptime Reliability" },
    { value: "15+", label: "Global Awards" },
  ],
  journey: {
    title: "The [HealthFlow] Journey",
    subtitle: "From a bold idea to a transformative platform — every step has been driven by our commitment to reimagining healthcare.",
    steps: [
      { year: "April 2025", title: "The Spark", desc: "HealthFlow was born from a simple question: why is healthcare so fragmented? Our founders set out to build a unified digital ecosystem." },
      { year: "August 2026", title: "First Clinics Onboarded", desc: "Piloted with 5 clinics across Bangladesh, validating our core platform and refining patient management workflows." },
      { year: "Ongoing", title: "The Future", desc: "Expanding into predictive health analytics, genomics integration, and cross-border healthcare connectivity." },
    ],
  },
  ceoMessage: {
    quote: "At HealthFlow, we believe that technology should serve humanity — not the other way around. Every feature we build, every partnership we forge, is guided by a singular purpose: to make quality healthcare accessible to every person, everywhere. This is not just our mission; it is our promise.",
    attributionLead: "A message from",
    attributionName: "HealthFlow",
  },
  vision: {
    eyebrow: "OUR VISION",
    title: "A Connected Future for Healthcare",
    statement: "To become the leading digital healthcare ecosystem, seamlessly connecting providers, patients, and healthcare services through innovation, intelligence, and trust.",
  },
  mission: {
    eyebrow: "OUR MISSION",
    title: "Empowering Care, One Platform at a Time",
    statement: "To empower healthcare organizations with integrated digital solutions that enhance operational efficiency, improve patient outcomes, and make quality healthcare more accessible.",
  },
  objectives: {
    title: "What Drives Us [Every Day]",
    subtitle: "Our objectives are the compass that guides every decision we make — from product design to patient care.",
    items: [
      { icon: "Users", title: "Patient-Centered Design", desc: "Putting patients at the heart of every interaction with intuitive, accessible, and compassionate digital experiences." },
      { icon: "Cpu", title: "AI-Driven Innovation", desc: "Leveraging artificial intelligence to enhance diagnostics, streamline operations, and predict health outcomes." },
      { icon: "Globe", title: "Universal Accessibility", desc: "Breaking down barriers to healthcare by making quality services available to all, regardless of location or means." },
      { icon: "ShieldCheck", title: "Trust & Security", desc: "Maintaining the highest standards of data privacy, regulatory compliance, and ethical technology use." },
      { icon: "TrendingUp", title: "Continuous Improvement", desc: "Evolving our platform through relentless iteration, feedback loops, and cutting-edge research." },
      { icon: "Handshake", title: "Provider Partnership", desc: "Building strong, lasting relationships with healthcare providers to co-create solutions that truly work." },
    ],
  },
};

/**
 * The same page in Bangla — what a Bangla visitor sees until the CMS has its
 * own. Icons, figures and people's names are the English page's.
 */
export const defaultAboutContentBn: AboutContent = {
  pillars: {
    title: "ভিত্তিমূলক [স্তম্ভ]",
    items: [
      { icon: "Leaf", title: "স্বাভাবিক বিকাশ", desc: "আপনার প্র্যাকটিসের সাথে স্বাভাবিকভাবে বেড়ে ওঠা ব্যবস্থা, যা বদলাতে থাকা চিকিৎসা-জগতে দীর্ঘস্থায়ী ও মানিয়ে নেওয়ার মতো।" },
      { icon: "HeartPulse", title: "রোগী-কেন্দ্রিক নির্ভুলতা", desc: "প্রতিটি কোড লেখা হয় রোগীর অভিজ্ঞতার কথা ভেবে — দ্রুততার চেয়ে সেরে ওঠাকেই আমরা বেশি গুরুত্ব দিই।" },
      { icon: "ShieldCheck", title: "অটল সততা", desc: "নিরাপত্তা ও নিয়ম মেনে চলা শুধু ফিচার নয়; এগুলোই চিকিৎসক ও রোগীদের সাথে আমাদের আস্থার ভিত্তি।" },
    ],
  },
  team: {
    title: "স্বপ্নদ্রষ্টারা",
    subtitle: "ক্লিনিক্যাল উৎকর্ষ ও ডিজিটাল উদ্ভাবনের মধ্যে সেতু গড়া আমাদের বহুমুখী দলের সাথে পরিচিত হোন।",
    members: [
      { name: "Dr. Elena Thorne", role: "চিফ মেডিকেল অফিসার" },
      { name: "Marcus Vane", role: "প্রোডাক্ট ডিজাইন প্রধান" },
      { name: "Julian Chen", role: "সিটিও ও প্রতিষ্ঠাতা" },
      { name: "Sarah Jenkins", role: "অপারেশনস ভাইস প্রেসিডেন্ট" },
    ],
  },
  stats: [
    { value: "500+", label: "শক্তিশালী ক্লিনিক" },
    { value: "1M+", label: "সেবা পাওয়া রোগী" },
    { value: "99.9%", label: "নির্ভরযোগ্য আপটাইম" },
    { value: "15+", label: "আন্তর্জাতিক পুরস্কার" },
  ],
  journey: {
    title: "[HealthFlow]-এর যাত্রা",
    subtitle: "একটি সাহসী ভাবনা থেকে একটি রূপান্তরকারী প্ল্যাটফর্ম — প্রতিটি ধাপ এগিয়েছে স্বাস্থ্যসেবাকে নতুন করে ভাবার অঙ্গীকারে।",
    steps: [
      { year: "এপ্রিল 2025", title: "সূচনা", desc: "একটি সহজ প্রশ্ন থেকে HealthFlow-এর জন্ম: স্বাস্থ্যসেবা এত বিচ্ছিন্ন কেন? আমাদের প্রতিষ্ঠাতারা একটি সমন্বিত ডিজিটাল ব্যবস্থা গড়তে শুরু করেন।" },
      { year: "আগস্ট 2026", title: "প্রথম ক্লিনিক যুক্ত", desc: "বাংলাদেশের 5টি ক্লিনিকে পরীক্ষামূলক চালু করে মূল প্ল্যাটফর্ম যাচাই ও রোগী ব্যবস্থাপনা আরও উন্নত করা হয়।" },
      { year: "চলমান", title: "ভবিষ্যৎ", desc: "পূর্বাভাসমূলক স্বাস্থ্য বিশ্লেষণ, জিনোমিক্স সংযোজন ও আন্তঃসীমান্ত স্বাস্থ্যসেবা সংযোগে সম্প্রসারণ।" },
    ],
  },
  ceoMessage: {
    quote: "HealthFlow-এ আমরা বিশ্বাস করি, প্রযুক্তি মানুষের সেবায় থাকবে — উল্টোটা নয়। আমাদের তৈরি প্রতিটি ফিচার, প্রতিটি অংশীদারত্ব একটি লক্ষ্যেই: প্রতিটি মানুষের কাছে, সব জায়গায়, মানসম্মত স্বাস্থ্যসেবা পৌঁছে দেওয়া। এটি শুধু আমাদের মিশন নয়; এটি আমাদের প্রতিশ্রুতি।",
    attributionLead: "একটি বার্তা",
    attributionName: "HealthFlow",
  },
  vision: {
    eyebrow: "আমাদের ভিশন",
    title: "স্বাস্থ্যসেবার একটি সংযুক্ত ভবিষ্যৎ",
    statement: "উদ্ভাবন, বুদ্ধিমত্তা ও আস্থার মাধ্যমে চিকিৎসাসেবা প্রদানকারী, রোগী ও স্বাস্থ্যসেবাকে নির্বিঘ্নে সংযুক্ত করে শীর্ষস্থানীয় ডিজিটাল স্বাস্থ্যসেবা ব্যবস্থা হয়ে ওঠা।",
  },
  mission: {
    eyebrow: "আমাদের মিশন",
    title: "একটি প্ল্যাটফর্মে সেবাকে শক্তিশালী করা",
    statement: "সমন্বিত ডিজিটাল সমাধান দিয়ে স্বাস্থ্যসেবা প্রতিষ্ঠানকে শক্তিশালী করা — যাতে কাজ আরও দক্ষ হয়, রোগীর ফলাফল ভালো হয় এবং মানসম্মত স্বাস্থ্যসেবা আরও সহজলভ্য হয়।",
  },
  objectives: {
    title: "প্রতিদিন যা আমাদের [এগিয়ে নেয়]",
    subtitle: "আমাদের লক্ষ্যগুলোই প্রতিটি সিদ্ধান্তের দিকনির্দেশক — প্রোডাক্ট ডিজাইন থেকে রোগীর সেবা পর্যন্ত।",
    items: [
      { icon: "Users", title: "রোগী-কেন্দ্রিক ডিজাইন", desc: "সহজ, সবার জন্য ব্যবহারযোগ্য ও সহানুভূতিশীল ডিজিটাল অভিজ্ঞতায় প্রতিটি যোগাযোগের কেন্দ্রে রোগী।" },
      { icon: "Cpu", title: "এআই-চালিত উদ্ভাবন", desc: "রোগনির্ণয় উন্নত করতে, কাজ সহজ করতে ও স্বাস্থ্যের ফলাফল পূর্বাভাস দিতে কৃত্রিম বুদ্ধিমত্তার ব্যবহার।" },
      { icon: "Globe", title: "সবার জন্য সহজলভ্যতা", desc: "অবস্থান বা সামর্থ্য নির্বিশেষে সবার কাছে মানসম্মত সেবা পৌঁছে দিয়ে স্বাস্থ্যসেবার বাধা দূর করা।" },
      { icon: "ShieldCheck", title: "আস্থা ও নিরাপত্তা", desc: "তথ্যের গোপনীয়তা, নিয়ম মেনে চলা ও নৈতিক প্রযুক্তি ব্যবহারে সর্বোচ্চ মান বজায় রাখা।" },
      { icon: "TrendingUp", title: "নিরন্তর উন্নতি", desc: "অবিরাম পরিমার্জন, মতামত ও আধুনিক গবেষণার মাধ্যমে প্ল্যাটফর্মকে এগিয়ে নেওয়া।" },
      { icon: "Handshake", title: "সেবাদাতাদের সাথে অংশীদারত্ব", desc: "স্বাস্থ্যসেবা প্রদানকারীদের সাথে দৃঢ় ও দীর্ঘস্থায়ী সম্পর্ক গড়ে একসাথে কার্যকর সমাধান তৈরি করা।" },
    ],
  },
};

type AboutBlocks = Partial<AboutContent>;

export const defaultAboutFor = (locale: Locale): AboutContent =>
  locale === "bn" ? defaultAboutContentBn : defaultAboutContent;

/** The page in one language, from the row's blocks (see cmsLocale for the layout). */
export const blocksToAboutContent = (blocks: unknown, locale: Locale = "en"): AboutContent => {
  const b = blocksFor(blocks, locale) as AboutBlocks;
  const d = defaultAboutFor(locale);
  // Section titles carry [gradient] marks (lib/markedTitle); a stored title
  // still at its default gets them back.
  const titled = <T extends { title: string }>(section: T, fallback: T): T =>
    ({ ...section, title: withDefaultMarks(section.title, fallback.title) });
  return {
    pillars: titled({ ...d.pillars, ...(b.pillars ?? {}) }, d.pillars),
    team: { ...d.team, ...(b.team ?? {}) },
    stats: b.stats ?? d.stats,
    journey: titled({ ...d.journey, ...(b.journey ?? {}) }, d.journey),
    ceoMessage: { ...d.ceoMessage, ...(b.ceoMessage ?? {}) },
    vision: { ...d.vision, ...(b.vision ?? {}) },
    mission: { ...d.mission, ...(b.mission ?? {}) },
    objectives: titled({ ...d.objectives, ...(b.objectives ?? {}) }, d.objectives),
  };
};

export const aboutContentToBlocks = (content: AboutContent) => ({
  pillars: content.pillars,
  team: content.team,
  stats: content.stats,
  journey: content.journey,
  ceoMessage: content.ceoMessage,
  vision: content.vision,
  mission: content.mission,
  objectives: content.objectives,
});
