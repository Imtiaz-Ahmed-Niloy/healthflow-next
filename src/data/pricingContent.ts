import type { Locale } from "@/i18n/config";
import { blocksFor } from "@/data/cmsLocale";
import { withDefaultMarks } from "@/lib/markedTitle";

export type PricingFeature = { text: string; on: boolean };
export type PricingPlan = {
  name: string;
  price: string;
  unit?: string;
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
    title: "Pay for the [prescriptions you write]",
    subtitle:
      "HealthFlow runs your appointments, patient records and prescriptions on one system, and the bigger plans add the rest of the hospital. You pay only for the prescriptions your doctors write. A month with none costs nothing.",
  },
  plans: [
    {
      name: "Doctor Panel",
      price: "10",
      unit: "Per Prescription",
      tag: "For clinics and doctors' chambers.",
      cta: "Talk to us",
      featured: false,
      features: [
        { text: "Digital prescriptions", on: true },
        { text: "Live patient queue", on: true },
        { text: "Appointment scheduling & calendar", on: true },
        { text: "Patient records & visit history", on: true },
        { text: "Multi-chamber management", on: true },
        { text: "Doctor assistant delegation", on: true },
        { text: "Drug & diagnosis dictionary", on: true },
      ],
    },
    {
      name: "Pharmacy Panel",
      price: "5",
      unit: "Per Invoice",
      tag: "For pharmacies, medical stores and dispensaries.",
      cta: "Talk to us",
      featured: true,
      features: [
        { text: "Fast POS & barcode billing", on: true },
        { text: "Batch & expiry stock tracking", on: true },
        { text: "Low stock & expiry alerts", on: true },
        { text: "Purchase orders & suppliers", on: true },
        { text: "Cash drawer & shift closing", on: true },
        { text: "Sales history & invoice receipts", on: true },
        { text: "Expense & profit/loss reports", on: true },
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

/**
 * The same page in Bangla — what a Bangla visitor sees until the CMS has its
 * own. Prices and which plan is featured are never read from here; they are
 * always the English plans' (see blocksToPricingContent).
 */
export const defaultPricingContentBn: PricingContent = {
  hero: {
    title: "যত [প্রেসক্রিপশন], ততটুকুই খরচ",
    subtitle:
      "HealthFlow একটি ব্যবস্থায় আপনার অ্যাপয়েন্টমেন্ট, রোগীর রেকর্ড ও প্রেসক্রিপশন চালায়, আর বড় প্ল্যানগুলো হাসপাতালের বাকি কাজও যোগ করে। আপনি শুধু আপনার ডাক্তারদের লেখা প্রেসক্রিপশনের জন্য টাকা দেন। যে মাসে কোনো প্রেসক্রিপশন নেই, সে মাসে কোনো খরচ নেই।",
  },
  plans: [
    {
      name: "ডাক্তার প্যানেল",
      price: "10",
      unit: "প্রতি প্রেসক্রিপশন",
      tag: "ক্লিনিক ও ডাক্তারের চেম্বারের জন্য।",
      cta: "যোগাযোগ করুন",
      featured: false,
      features: [
        { text: "ডিজিটাল প্রেসক্রিপশন", on: true },
        { text: "লাইভ রোগী কিউ", on: true },
        { text: "অ্যাপয়েন্টমেন্ট শিডিউলিং ও ক্যালেন্ডার", on: true },
        { text: "রোগীর রেকর্ড ও চিকিৎসার ইতিহাস", on: true },
        { text: "একাধিক চেম্বার ব্যবস্থাপনা", on: true },
        { text: "ডাক্তার সহকারী দায়িত্ব বণ্টন", on: true },
        { text: "ওষুধ ও রোগ নির্ণয় অভিধান", on: true },
      ],
    },
    {
      name: "ফার্মেসি প্যানেল",
      price: "5",
      unit: "প্রতি ইনভয়েস",
      tag: "ফার্মেসি, ওষুধের দোকান ও ডিসপেনসারির জন্য।",
      cta: "যোগাযোগ করুন",
      featured: true,
      features: [
        { text: "দ্রুত POS ও বারকোড বিলিং", on: true },
        { text: "ব্যাচ ও মেয়াদ স্টক ট্র্যাকিং", on: true },
        { text: "কম স্টক ও মেয়াদের সতর্কতা", on: true },
        { text: "ক্রয় আদেশ ও সরবরাহকারী", on: true },
        { text: "ক্যাশ ড্রয়ার ও শিফট ক্লোজিং", on: true },
        { text: "বিক্রয় ইতিহাস ও ইনভয়েস রশিদ", on: true },
        { text: "খরচ ও লাভ/ক্ষতি রিপোর্ট", on: true },
      ],
    },
    {
      name: "এন্টারপ্রাইজ",
      price: "50",
      tag: "যেসব হাসপাতাল ব্যাক অফিসও এখানে চালায়।",
      cta: "যোগাযোগ করুন",
      featured: false,
      features: [
        { text: "প্রফেশনালের সবকিছু", on: true },
        { text: "বেতন ও পে-স্লিপ", on: true },
        { text: "ট্যালি-ধাঁচের হিসাব, বাজেট ও খরচ কেন্দ্র", on: true },
        { text: "ক্রয়, সরবরাহকারী ও সম্পদ", on: true },
        { text: "আর্থিক রিপোর্ট", on: true },
        { text: "সীমাহীন কর্মী অ্যাকাউন্ট", on: true },
        { text: "নির্দিষ্ট অ্যাকাউন্ট ম্যানেজার", on: true },
      ],
    },
  ],
  compareRows: [
    { label: "কর্মী অ্যাকাউন্ট", values: ["5টি পর্যন্ত", "25টি পর্যন্ত", "সীমাহীন"], bold: [3] },
    { label: "ডকুমেন্ট সংরক্ষণ", values: ["5 GB", "20 GB", "সীমাহীন"], bold: [3] },
    { label: "ডাক্তার পোর্টাল ও প্রেসক্রিপশন", values: ["✓", "✓", "✓"] },
    { label: "অ্যাপয়েন্টমেন্ট ও রোগীর রেকর্ড", values: ["✓", "✓", "✓"] },
    { label: "রোগী পোর্টাল", values: ["✓", "✓", "✓"] },
    { label: "ওয়ার্ড, বেড ও ভর্তি", values: ["—", "✓", "✓"] },
    { label: "ল্যাবরেটরি ও ফার্মেসি", values: ["—", "✓", "✓"] },
    { label: "রোগীর বিলিং ও ইনভয়েস", values: ["—", "✓", "✓"] },
    { label: "কর্মী, হাজিরা ও ছুটি", values: ["—", "✓", "✓"] },
    { label: "বেতন", values: ["—", "—", "✓"] },
    { label: "হিসাব ও আর্থিক রিপোর্ট", values: ["—", "—", "✓"] },
    { label: "ক্রয়, সরবরাহকারী ও সম্পদ", values: ["—", "—", "✓"] },
    { label: "রোলভিত্তিক অ্যাক্সেস ও অডিট লগ", values: ["✓", "✓", "✓"] },
    { label: "সহায়তা", values: ["ইমেইল", "অগ্রাধিকার", "নির্দিষ্ট অ্যাকাউন্ট ম্যানেজার"], bold: [3] },
  ],
  faqs: [
    {
      q: "প্রেসক্রিপশন হিসেবে কী গণ্য হয়?",
      a: "HealthFlow-এ একজন ডাক্তারের সম্পন্ন করা এমন পরামর্শ, যাতে অন্তত একটি ওষুধ আছে। বাতিল অ্যাপয়েন্টমেন্ট, না আসা রোগী এবং ওষুধ ছাড়া শেষ হওয়া ভিজিট গণ্য হয় না।",
    },
    {
      q: "আমাদের কীভাবে বিল করা হয়?",
      a: "মাসে একবার। ইনভয়েসে সেই মাসে আপনার ডাক্তারদের লেখা প্রেসক্রিপশন গুনে আপনার প্ল্যানের দরে গুণ করা হয়, আপনার ছাড় থাকলে তা বাদ দিয়ে। ইস্যুর 14 দিনের মধ্যে পরিশোধ করতে হয়।",
    },
    {
      q: "কোনো মাসে একটিও প্রেসক্রিপশন না লিখলে?",
      a: "তাহলে সে মাসের কোনো ইনভয়েস হবে না। আপনাকে কিছুই দিতে হবে না।",
    },
    {
      q: "পরে কি প্ল্যান বদলানো যাবে?",
      a: "হ্যাঁ। আমাদের জানালেই আমরা বদলে দেব, আর পরের ইনভয়েস থেকে নতুন দর প্রযোজ্য হবে।",
    },
    {
      q: "আমাদের হাসপাতালের তথ্য কি আলাদা রাখা হয়?",
      a: "হ্যাঁ। প্রতিটি হাসপাতালের রেকর্ড ডেটাবেসেই অন্য সব হাসপাতাল থেকে আলাদা করে রাখা হয়। হাসপাতালের ভেতরেও প্রতিটি রোল শুধু যা দরকার তা-ই দেখে — যেমন ডাক্তার বেতনের তথ্য দেখেন না — আর প্রতিটি পরিবর্তন অডিট লগে লেখা থাকে।",
    },
    {
      q: "কীভাবে শুরু করব?",
      a: "আমাদের সাথে যোগাযোগ করুন। আমরা আপনার হাসপাতালের লাইসেন্স যাচাই করে অ্যাকাউন্ট তৈরি করব এবং কর্মীদের লগইন দেব। রোগীরা নিজেরাই সাইন আপ করবেন।",
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
    unit: typeof plan.unit === "string" && plan.unit.trim() ? plan.unit.trim() : undefined,
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

/** One language's page, read from its own blocks. */
const parsePricing = (b: PricingBlocks, d: PricingContent): PricingContent => {
  const plans = Array.isArray(b.plans) ? b.plans.map(normalizePlan) : d.plans;
  const rawRows = Array.isArray(b.compareRows)
    ? b.compareRows.map(normalizeCompareRow)
    : d.compareRows;
  const hero = { ...d.hero, ...(b.hero ?? {}) };
  return {
    hero: { ...hero, title: withDefaultMarks(hero.title, d.hero.title) },
    plans,
    compareRows: rawRows.map(row => fitRowToPlans(row, plans.length)),
    faqs: Array.isArray(b.faqs) ? b.faqs : d.faqs,
  };
};

export const defaultPricingFor = (locale: Locale): PricingContent =>
  locale === "bn" ? defaultPricingContentBn : defaultPricingContent;

/**
 * The page in one language (see cmsLocale for the row's layout).
 *
 * Bangla supplies only words. What a plan costs, whether it is featured and
 * how many plans there are always come from the English plans, so a price
 * changed in English can never be left stale for Bangla visitors. A plan with
 * no Bangla copy yet shows its English one.
 */
export const blocksToPricingContent = (blocks: unknown, locale: Locale = "en"): PricingContent => {
  const english = parsePricing(blocksFor(blocks, "en") as PricingBlocks, defaultPricingContent);
  if (locale !== "bn") return english;

  const bangla = parsePricing(blocksFor(blocks, "bn") as PricingBlocks, defaultPricingContentBn);
  const plans = english.plans.map((plan, i) => {
    const words = bangla.plans[i];
    return words ? { ...words, price: plan.price, featured: plan.featured, unit: words.unit || plan.unit } : plan;
  });
  return {
    ...bangla,
    plans,
    compareRows: bangla.compareRows.map(row => fitRowToPlans(row, plans.length)),
  };
};

export const pricingContentToBlocks = (content: PricingContent) => ({
  hero: content.hero,
  plans: content.plans,
  compareRows: content.compareRows,
  faqs: content.faqs,
});
