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
    title: "Foundational Pillars",
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
    title: "The HealthFlow Journey",
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
    title: "What Drives Us Every Day",
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

type AboutBlocks = Partial<AboutContent>;

export const blocksToAboutContent = (blocks: unknown): AboutContent => {
  const b = (blocks ?? {}) as AboutBlocks;
  return {
    pillars: { ...defaultAboutContent.pillars, ...(b.pillars ?? {}) },
    team: { ...defaultAboutContent.team, ...(b.team ?? {}) },
    stats: b.stats ?? defaultAboutContent.stats,
    journey: { ...defaultAboutContent.journey, ...(b.journey ?? {}) },
    ceoMessage: { ...defaultAboutContent.ceoMessage, ...(b.ceoMessage ?? {}) },
    vision: { ...defaultAboutContent.vision, ...(b.vision ?? {}) },
    mission: { ...defaultAboutContent.mission, ...(b.mission ?? {}) },
    objectives: { ...defaultAboutContent.objectives, ...(b.objectives ?? {}) },
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
