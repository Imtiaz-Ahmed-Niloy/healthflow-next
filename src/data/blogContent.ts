/**
 * Blog page chrome — masthead, section copy, newsletter, and the category
 * filter list. All of it lives in cms_pages.blocks under slug "blog".
 *
 * The articles themselves are rows in cms_blog_posts; see data/blogPost.ts.
 * Categories sit here rather than there because they are the page’s filter
 * bar, not a property of any one article.
 */
export type BlogContent = {
  masthead: {
    volume: string;
    editor: string;
    title: string;
    tagline: string;
    editionLabel: string;
  };
  /** Filter bar, in order. The first entry is the default and shows everything. */
  categories: string[];
  trendingTitle: string;
  leadEyebrow: string;
  leadKicker: string;
  gridTitle: string;
  emptyText: string;
  newsletter: {
    title: string;
    subtitle: string;
    placeholder: string;
    buttonLabel: string;
    successTitle: string;
    successBody: string;
  };
};

export const defaultBlogContent: BlogContent = {
  masthead: {
    volume: "Vol. XII · No. 142",
    editor: "Edited in Portland, OR",
    title: "The Healing Times",
    tagline: "Long-form journalism from the doctors of HealthFlow — research, opinion, and notes from the ward.",
    editionLabel: "Daily Edition",
  },
  categories: ["All", "Research", "Cardiology", "Pediatrics", "Orthopedics", "Oncology", "Dermatology", "Mental Health", "Pulmonology", "Surgery"],
  trendingTitle: "Most Read",
  leadEyebrow: "Lead Story",
  leadKicker: "It's the kind of finding that makes the architecture of care matter as much as the medicine itself — a reminder that walls, windows and air can be instruments of healing.",
  gridTitle: "All Stories",
  emptyText: "No stories match your search. Try another keyword.",
  newsletter: {
    title: "Subscribe to the Sunday Edition",
    subtitle: "A weekly digest of our doctors' best long-reads, delivered with your morning coffee.",
    placeholder: "your@email.com",
    buttonLabel: "Subscribe",
    successTitle: "Subscribed!",
    successBody: "Check your inbox to confirm.",
  },
};

type BlogBlocks = Partial<BlogContent>;

// blocks is untyped jsonb — a field can come back as the wrong type (or an
// object/array where a string is expected), and React throws rendering a
// non-primitive as a child. /blog is a Server Component now, so that throw
// is a 500 for every visitor, not a broken section. Guard each field.
const str = (v: unknown, fallback: string): string => (typeof v === "string" ? v : fallback);

const normalizeMasthead = (m: unknown): BlogContent["masthead"] => {
  const masthead = (m ?? {}) as Partial<BlogContent["masthead"]>;
  return {
    volume: str(masthead.volume, defaultBlogContent.masthead.volume),
    editor: str(masthead.editor, defaultBlogContent.masthead.editor),
    title: str(masthead.title, defaultBlogContent.masthead.title),
    tagline: str(masthead.tagline, defaultBlogContent.masthead.tagline),
    editionLabel: str(masthead.editionLabel, defaultBlogContent.masthead.editionLabel),
  };
};

const normalizeNewsletter = (n: unknown): BlogContent["newsletter"] => {
  const newsletter = (n ?? {}) as Partial<BlogContent["newsletter"]>;
  return {
    title: str(newsletter.title, defaultBlogContent.newsletter.title),
    subtitle: str(newsletter.subtitle, defaultBlogContent.newsletter.subtitle),
    placeholder: str(newsletter.placeholder, defaultBlogContent.newsletter.placeholder),
    buttonLabel: str(newsletter.buttonLabel, defaultBlogContent.newsletter.buttonLabel),
    successTitle: str(newsletter.successTitle, defaultBlogContent.newsletter.successTitle),
    successBody: str(newsletter.successBody, defaultBlogContent.newsletter.successBody),
  };
};

// Same defensive reasoning as str(): blocks is untyped jsonb, so a category
// list could come back as anything at all.
const strList = (v: unknown, fallback: string[]): string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? v : fallback;

export const blocksToBlogContent = (blocks: unknown): BlogContent => {
  const b = (blocks ?? {}) as BlogBlocks;
  return {
    masthead: normalizeMasthead(b.masthead),
    categories: strList(b.categories, defaultBlogContent.categories),
    trendingTitle: str(b.trendingTitle, defaultBlogContent.trendingTitle),
    leadEyebrow: str(b.leadEyebrow, defaultBlogContent.leadEyebrow),
    leadKicker: str(b.leadKicker, defaultBlogContent.leadKicker),
    gridTitle: str(b.gridTitle, defaultBlogContent.gridTitle),
    emptyText: str(b.emptyText, defaultBlogContent.emptyText),
    newsletter: normalizeNewsletter(b.newsletter),
  };
};

export const blogContentToBlocks = (content: BlogContent) => ({
  masthead: content.masthead,
  categories: content.categories,
  trendingTitle: content.trendingTitle,
  leadEyebrow: content.leadEyebrow,
  leadKicker: content.leadKicker,
  gridTitle: content.gridTitle,
  emptyText: content.emptyText,
  newsletter: content.newsletter,
});
