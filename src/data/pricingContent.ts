export type PricingFeature = { text: string; on: boolean };
export type PricingPlan = {
  name: string;
  price: string;
  tag: string;
  cta: string;
  featured: boolean;
  features: PricingFeature[];
};
// One cell per plan: values[i] lines up with plans[i]. Adding a plan in the CMS
// grows every row by one cell, so the compare table always mirrors the plan list.
export type CompareRow = { label: string; values: string[]; bold?: number[] };
export type Faq = { q: string; a: string };

export type PricingContent = {
  hero: { eyebrow: string; title: string; subtitle: string };
  plans: PricingPlan[];
  compareRows: CompareRow[];
  faqs: Faq[];
};

export const defaultPricingContent: PricingContent = {
  hero: {
    eyebrow: "FLEXIBLE PLANS",
    title: "Invest in Restorative Care",
    subtitle:
      "Transparent pricing designed for individuals, growing clinics, and established health institutions. Choose the flow that fits your lifestyle.",
  },
  plans: [
    {
      name: "Basic",
      price: "10",
      tag: "Essential care for individuals.",
      cta: "Start Basic",
      featured: false,
      features: [
        { text: "Unlimited Prescription", on: true },
        { text: "Basic Health Analytics", on: true },
        { text: "Email Support (48h response)", on: true },
        { text: "5GB Secure Health Storage", on: true },
        { text: "Wearable Device Sync", on: true },
        { text: "Priority Appointment", on: false },
        { text: "AI Health Predictive Insights", on: false },
      ],
    },
    {
      name: "Professional",
      price: "30",
      tag: "Complete restorative solution.",
      cta: "Get Pro Now",
      featured: true,
      features: [
        { text: "Unlimited Prescription", on: true },
        { text: "Advanced Bio-Analytics", on: true },
        { text: "24/7 Priority Support", on: true },
        { text: "Dedicated Wellness Coach", on: true },
        { text: "20GB Secure Health Storage", on: true },
        { text: "AI Health Predictive Insights", on: true },
        { text: "Mental Health Modules", on: true },
      ],
    },
    {
      name: "Enterprise",
      price: "50",
      tag: "Scaleable care for teams.",
      cta: "Contact Sales",
      featured: false,
      features: [
        { text: "Unlimited Prescription", on: true },
        { text: "Health Compliance Reports", on: true },
        { text: "API Access & Integration", on: true },
        { text: "Custom Onboarding", on: true },
        { text: "Unlimited Secure Storage", on: true },
        { text: "Custom AI Models for Clinic", on: true },
        { text: "Dedicated Account Manager", on: true },
      ],
    },
  ],
  compareRows: [
    { label: "Consultations per Month", values: ["2 Sessions", "Unlimited", "Unlimited"] },
    { label: "Health Record Storage", values: ["5 GB", "20 GB", "Unlimited"], bold: [3] },
    { label: "AI Insights Level", values: ["Standard Baseline", "Predictive Patterns", "Custom Trained Models"], bold: [2] },
    { label: "Support Priority", values: ["Standard (Email)", "Priority 24/7", "Dedicated Concierge"], bold: [2] },
    { label: "Team Management", values: ["—", "—", "Up to 10 Seats"], bold: [3] },
    { label: "API & Webhooks", values: ["—", "Read-only", "Full Access"], bold: [3] },
    { label: "HIPAA Security", values: ["Standard", "Enhanced Encryption", "Enterprise Audited"], bold: [2] },
    { label: "Virtual Visits", values: ["2 per month", "Unlimited", "Unlimited"], bold: [2] },
    { label: "Lab Integrations", values: ["✓", "✓", "✓"] },
  ],
  faqs: [
    { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade your plan at any time through your dashboard. Price adjustments will be applied to your next billing cycle." },
    { q: "Is there a free trial available?", a: "We offer a 14-day restorative trial for our Pro plan, allowing you to experience our full suite of bio-analytics and coaching features." },
    { q: "What is HIPAA Compliance?", a: "We adhere to strict federal standards for protecting sensitive patient health information from being disclosed without the patient's consent or knowledge." },
    { q: "How do I cancel my subscription?", a: "You can cancel your subscription at any time with a single click in your account settings. No hidden fees, no long-term contracts." },
  ],
};

type PricingBlocks = Partial<PricingContent>;

const normalizeFeature = (f: unknown): PricingFeature => {
  const feature = (f ?? {}) as Partial<PricingFeature>;
  return { text: feature.text ?? "", on: feature.on ?? false };
};

const normalizePlan = (p: unknown): PricingPlan => {
  const plan = (p ?? {}) as Partial<PricingPlan>;
  return {
    name: plan.name ?? "",
    price: plan.price ?? "",
    tag: plan.tag ?? "",
    cta: plan.cta ?? "",
    featured: plan.featured ?? false,
    features: Array.isArray(plan.features) ? plan.features.map(normalizeFeature) : [],
  };
};

const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

// Accepts both the current shape ({ values: [...] }) and the legacy fixed shape
// ({ basic, pro, enterprise }) so rows saved before the compare table went
// plan-driven still map cleanly.
const normalizeCompareRow = (r: unknown): CompareRow => {
  const row = (r ?? {}) as Partial<CompareRow> & { basic?: unknown; pro?: unknown; enterprise?: unknown; label?: unknown };
  const values = Array.isArray(row.values)
    ? row.values.map(asText)
    : [row.basic, row.pro, row.enterprise].filter(v => v !== undefined).map(asText);
  const bold = Array.isArray(row.bold) ? row.bold.filter((n): n is number => typeof n === "number") : undefined;
  return { label: asText(row.label), values, ...(bold && bold.length ? { bold } : {}) };
};

// Keep every row's cell count in step with the plan list. A plan added after the
// rows were last saved gets a placeholder cell; a removed plan drops its column.
const fitRowToPlans = (row: CompareRow, planCount: number): CompareRow =>
  row.values.length === planCount
    ? row
    : { ...row, values: Array.from({ length: planCount }, (_, i) => row.values[i] ?? "—") };

export const blocksToPricingContent = (blocks: unknown): PricingContent => {
  const b = (blocks ?? {}) as PricingBlocks;
  const plans = Array.isArray(b.plans) ? b.plans.map(normalizePlan) : defaultPricingContent.plans;
  const rawRows = Array.isArray(b.compareRows)
    ? b.compareRows.map(normalizeCompareRow)
    : defaultPricingContent.compareRows;
  return {
    hero: { ...defaultPricingContent.hero, ...(b.hero ?? {}) },
    plans,
    compareRows: rawRows.map(row => fitRowToPlans(row, plans.length)),
    faqs: Array.isArray(b.faqs) ? b.faqs : defaultPricingContent.faqs,
  };
};

export const pricingContentToBlocks = (content: PricingContent) => ({
  hero: content.hero,
  plans: content.plans,
  compareRows: content.compareRows,
  faqs: content.faqs,
});
