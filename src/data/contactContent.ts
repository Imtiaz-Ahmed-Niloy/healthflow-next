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

type ContactBlocks = Partial<ContactContent>;

export const blocksToContactContent = (blocks: unknown): ContactContent => {
  const b = (blocks ?? {}) as ContactBlocks;
  const form: Partial<ContactContent["form"]> = b.form ?? {};
  const support: Partial<ContactContent["support"]> = b.support ?? {};
  return {
    form: {
      ...defaultContactContent.form,
      ...form,
      subjects: Array.isArray(form.subjects) ? form.subjects : defaultContactContent.form.subjects,
    },
    support: {
      ...defaultContactContent.support,
      ...support,
      channels: Array.isArray(support.channels) ? support.channels : defaultContactContent.support.channels,
    },
  };
};

export const contactContentToBlocks = (content: ContactContent) => ({
  form: content.form,
  support: content.support,
});
