import type { Locale } from "@/i18n/config";
import { blocksFor } from "@/data/cmsLocale";

export type ContactChannel = {
  icon: string;
  title: string;
  meta: string;
  value: string;
  href: string;
};

export type ContactContent = {
  form: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    subjectLabel: string;
    subjects: string[];
    messageLabel: string;
    messagePlaceholder: string;
    submitLabel: string;
    successMessage: string;
  };
  support: {
    title: string;
    channels: ContactChannel[];
    helpline: { label: string; href: string };
  };
};

export const defaultContactContent: ContactContent = {
  form: {
    nameLabel: "FULL NAME", namePlaceholder: "E.g. Julian Reed",
    emailLabel: "EMAIL ADDRESS", emailPlaceholder: "julian@example.com",
    subjectLabel: "SUBJECT",
    subjects: ["General Inquiry", "Technical Support", "Medical Inquiry", "Sales"],
    messageLabel: "HOW CAN WE HELP?", messagePlaceholder: "Your message...",
    submitLabel: "Send Message",
    successMessage: "Message sent! We'll respond within 2 hours.",
  },
  support: {
    title: "Direct Support",
    channels: [
      { icon: "Mail", title: "Email Support", meta: "Response time: Within 2 hours", value: "care@healthflowbd.com", href: "mailto:care@healthflowbd.com" },
      { icon: "Phone", title: "Phone Inquiries", meta: "Mon - Fri, 10am - 6pm ", value: "+880 0000000000", href: "tel:+880000000000" },
    ],
    helpline: { label: "Call Help Center: 00000", href: "tel:00000" },
  },
};

/**
 * The same page in Bangla — what a Bangla visitor sees until the CMS has its
 * own. Addresses, numbers and links are the English page's.
 */
export const defaultContactContentBn: ContactContent = {
  form: {
    nameLabel: "পূর্ণ নাম", namePlaceholder: "যেমন: রাহিম আহমেদ",
    emailLabel: "ইমেইল ঠিকানা", emailPlaceholder: "rahim@example.com",
    subjectLabel: "বিষয়",
    subjects: ["সাধারণ জিজ্ঞাসা", "কারিগরি সহায়তা", "চিকিৎসা-সংক্রান্ত জিজ্ঞাসা", "বিক্রয়"],
    messageLabel: "কীভাবে সাহায্য করতে পারি?", messagePlaceholder: "আপনার বার্তা...",
    submitLabel: "বার্তা পাঠান",
    successMessage: "বার্তা পাঠানো হয়েছে! আমরা 2 ঘণ্টার মধ্যে উত্তর দেব।",
  },
  support: {
    title: "সরাসরি সহায়তা",
    channels: [
      { icon: "Mail", title: "ইমেইল সহায়তা", meta: "উত্তরের সময়: 2 ঘণ্টার মধ্যে", value: "care@healthflowbd.com", href: "mailto:care@healthflowbd.com" },
      { icon: "Phone", title: "ফোনে যোগাযোগ", meta: "সোম - শুক্র, সকাল 10টা - সন্ধ্যা 6টা", value: "+880 0000000000", href: "tel:+880000000000" },
    ],
    helpline: { label: "হেল্প সেন্টারে কল করুন: 00000", href: "tel:00000" },
  },
};

type ContactBlocks = Partial<ContactContent>;

export const defaultContactFor = (locale: Locale): ContactContent =>
  locale === "bn" ? defaultContactContentBn : defaultContactContent;

/** The page in one language, from the row's blocks (see cmsLocale for the layout). */
export const blocksToContactContent = (blocks: unknown, locale: Locale = "en"): ContactContent => {
  const b = blocksFor(blocks, locale) as ContactBlocks;
  const d = defaultContactFor(locale);
  const form: Partial<ContactContent["form"]> = b.form ?? {};
  const support: Partial<ContactContent["support"]> = b.support ?? {};
  return {
    form: {
      ...d.form,
      ...form,
      subjects: Array.isArray(form.subjects) ? form.subjects : d.form.subjects,
    },
    support: {
      ...d.support,
      ...support,
      channels: Array.isArray(support.channels) ? support.channels : d.support.channels,
    },
  };
};

export const contactContentToBlocks = (content: ContactContent) => ({
  form: content.form,
  support: content.support,
});
