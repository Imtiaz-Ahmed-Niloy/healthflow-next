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
  hero: { title: string; subtitle: string };
  plans: PricingPlan[];
  compareRows: CompareRow[];
  faqs: Faq[];
};

/**
 * What the pricing page says when the CMS has nothing stored — and, since
 * 2026-09-11, what the stored row says too.
 *
 * Written from what the product does, not from the template it started as:
 * the per-prescription billing is `generate_platform_invoices` (0056), the
 * staff and storage limits are the `packages` catalogue (0010), and every
 * module named below is a page in the admin, doctor or patient panel.
 *
 * Nothing in the app switches modules on or off by plan yet. The split below
 * is the commercial offer — which departments each size of hospital is sold —
 * and onboarding is what holds a hospital to it.
 */
export const defaultPricingContent: PricingContent = {
  hero: {
    title: "Pay for the prescriptions you write",
    subtitle:
      "HealthFlow runs your appointments, patient records and prescriptions on one system, and the bigger plans add the rest of the hospital. You pay only for the prescriptions your doctors write. A month with none costs nothing.",
  },
  plans: [
    {
      name: "Basic",
      price: "10",
      tag: "For clinics and doctors' chambers.",
      cta: "Talk to us",
      featured: false,
      features: [
        { text: "Doctor portal with a live patient queue", on: true },
        { text: "Digital prescriptions", on: true },
        { text: "Appointments and patient records", on: true },
        { text: "Patient portal for your patients", on: true },
        { text: "Your hospital listed on HealthFlow", on: true },
        { text: "Wards, beds and admissions", on: false },
        { text: "Laboratory and pharmacy", on: false },
      ],
    },
    {
      name: "Professional",
      price: "30",
      tag: "For hospitals with wards, a lab and a pharmacy.",
      cta: "Talk to us",
      featured: true,
      features: [
        { text: "Everything in Basic", on: true },
        { text: "Wards, beds and admissions", on: true },
        { text: "Laboratory orders and results", on: true },
        { text: "Pharmacy stock with reorder alerts", on: true },
        { text: "Patient billing and invoices", on: true },
        { text: "Staff, attendance and leave", on: true },
        { text: "Payroll and accounts", on: false },
      ],
    },
    {
      name: "Enterprise",
      price: "50",
      tag: "For hospitals that run the back office here too.",
      cta: "Talk to us",
      featured: false,
      features: [
        { text: "Everything in Professional", on: true },
        { text: "Payroll and payslips", on: true },
        { text: "Tally-style accounts, budgets and cost centers", on: true },
        { text: "Procurement, vendors and assets", on: true },
        { text: "Financial reports", on: true },
        { text: "Unlimited staff accounts", on: true },
        { text: "A dedicated account manager", on: true },
      ],
    },
  ],
  compareRows: [
    { label: "Staff accounts", values: ["Up to 5", "Up to 25", "Unlimited"], bold: [3] },
    { label: "Document storage", values: ["5 GB", "20 GB", "Unlimited"], bold: [3] },
    { label: "Doctor portal and prescriptions", values: ["✓", "✓", "✓"] },
    { label: "Appointments and patient records", values: ["✓", "✓", "✓"] },
    { label: "Patient portal", values: ["✓", "✓", "✓"] },
    { label: "Wards, beds and admissions", values: ["—", "✓", "✓"] },
    { label: "Laboratory and pharmacy", values: ["—", "✓", "✓"] },
    { label: "Patient billing and invoices", values: ["—", "✓", "✓"] },
    { label: "Staff, attendance and leave", values: ["—", "✓", "✓"] },
    { label: "Payroll", values: ["—", "—", "✓"] },
    { label: "Accounts and financial reports", values: ["—", "—", "✓"] },
    { label: "Procurement, vendors and assets", values: ["—", "—", "✓"] },
    { label: "Role-based access and audit log", values: ["✓", "✓", "✓"] },
    { label: "Support", values: ["Email", "Priority", "Dedicated account manager"], bold: [3] },
  ],
  faqs: [
    {
      q: "What counts as a prescription?",
      a: "A consultation a doctor completes in HealthFlow with at least one medicine on it. Cancelled appointments, no-shows and visits that end without a medicine are not counted.",
    },
    {
      q: "How are we billed?",
      a: "Once a month. The invoice counts the prescriptions your doctors wrote that month and multiplies them by your plan's rate, less any discount you have. It is due 14 days after it is issued.",
    },
    {
      q: "What if we write no prescriptions in a month?",
      a: "Then there is no invoice for that month. You pay nothing.",
    },
    {
      q: "Can we change plans later?",
      a: "Yes. Tell us and we will move you, and the new rate applies from your next invoice.",
    },
    {
      q: "Is our hospital's data kept separate?",
      a: "Yes. Each hospital's records are walled off from every other hospital's in the database itself. Inside your hospital, each role sees only what it needs, so a doctor does not see payroll, and every change is written to an audit log.",
    },
    {
      q: "How do we get started?",
      a: "Contact us. We verify your hospital's licence, set up your account and create logins for your staff. Your patients sign up on their own.",
    },
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
