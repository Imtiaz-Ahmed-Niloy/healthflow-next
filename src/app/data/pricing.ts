import { load, save } from "@/lib/storage";

export type PricingFeature = { text: string; on: boolean };
export type PricingPlan = {
  name: string;
  price: string;
  tag: string;
  cta: string;
  featured: boolean;
  features: PricingFeature[];
};
export type CompareRow = { label: string; basic: string; pro: string; enterprise: string; bold?: number[] };
export type Faq = { q: string; a: string };

export type PricingData = {
  hero: { eyebrow: string; title: string; subtitle: string };
  plans: PricingPlan[];
  compareRows: CompareRow[];
  faqs: Faq[];
};

export const defaultPricing: PricingData = {
  hero: {
    eyebrow: "FLEXIBLE PLANS",
    title: "Invest in Restorative Care",
    subtitle:
      "Transparent pricing designed for individuals, growing clinics, and established health institutions. Choose the flow that fits your lifestyle.",
  },
  plans: [
    {
      name: "Basic",
      price: "49",
      tag: "Essential care for individuals.",
      cta: "Start Basic",
      featured: false,
      features: [
        { text: "2 Consultations per month", on: true },
        { text: "Basic Health Analytics", on: true },
        { text: "Email Support (48h response)", on: true },
        { text: "5GB Secure Health Storage", on: true },
        { text: "Wearable Device Sync", on: true },
        { text: "Priority Appointment", on: false },
        { text: "AI Health Predictive Insights", on: false },
      ],
    },
    {
      name: "Pro",
      price: "99",
      tag: "Complete restorative solution.",
      cta: "Get Pro Now",
      featured: true,
      features: [
        { text: "Unlimited Consultations", on: true },
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
      price: "249",
      tag: "Scaleable care for teams.",
      cta: "Contact Sales",
      featured: false,
      features: [
        { text: "Up to 10 Team Members", on: true },
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
    { label: "Consultations per Month", basic: "2 Sessions", pro: "Unlimited", enterprise: "Unlimited" },
    { label: "Health Record Storage", basic: "5 GB", pro: "20 GB", enterprise: "Unlimited", bold: [3] },
    { label: "AI Insights Level", basic: "Standard Baseline", pro: "Predictive Patterns", enterprise: "Custom Trained Models", bold: [2] },
    { label: "Support Priority", basic: "Standard (Email)", pro: "Priority 24/7", enterprise: "Dedicated Concierge", bold: [2] },
    { label: "Team Management", basic: "—", pro: "—", enterprise: "Up to 10 Seats", bold: [3] },
    { label: "API & Webhooks", basic: "—", pro: "Read-only", enterprise: "Full Access", bold: [3] },
    { label: "HIPAA Security", basic: "Standard", pro: "Enhanced Encryption", enterprise: "Enterprise Audited", bold: [2] },
    { label: "Virtual Visits", basic: "2 per month", pro: "Unlimited", enterprise: "Unlimited", bold: [2] },
    { label: "Lab Integrations", basic: "✓", pro: "✓", enterprise: "✓" },
  ],
  faqs: [
    { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade your plan at any time through your dashboard. Price adjustments will be applied to your next billing cycle." },
    { q: "Is there a free trial available?", a: "We offer a 14-day restorative trial for our Pro plan, allowing you to experience our full suite of bio-analytics and coaching features." },
    { q: "What is HIPAA Compliance?", a: "We adhere to strict federal standards for protecting sensitive patient health information from being disclosed without the patient's consent or knowledge." },
    { q: "How do I cancel my subscription?", a: "You can cancel your subscription at any time with a single click in your account settings. No hidden fees, no long-term contracts." },
  ],
};

export const PRICING_KEY = "pricing-data";

export const loadPricing = (): PricingData => load<PricingData>(PRICING_KEY, defaultPricing);
export const savePricing = (data: PricingData) => {
  save(PRICING_KEY, data);
  // notify same-tab subscribers
  window.dispatchEvent(new CustomEvent("pricing:updated"));
};

// Back-compat export
export const plans = defaultPricing.plans;
