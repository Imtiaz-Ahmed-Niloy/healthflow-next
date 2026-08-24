/**
 * Blog page chrome only — masthead, section copy, newsletter. Individual
 * posts and categories are out of scope for this migration (tracked
 * separately as cms_blog_posts) and stay on the localStorage mechanism in
 * blogPosts.ts.
 */
export type BlogContent = {
  masthead: {
    volume: string;
    editor: string;
    title: string;
    tagline: string;
    editionLabel: string;
  };
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

export const blocksToBlogContent = (blocks: unknown): BlogContent => {
  const b = (blocks ?? {}) as BlogBlocks;
  return {
    masthead: { ...defaultBlogContent.masthead, ...(b.masthead ?? {}) },
    trendingTitle: b.trendingTitle ?? defaultBlogContent.trendingTitle,
    leadEyebrow: b.leadEyebrow ?? defaultBlogContent.leadEyebrow,
    leadKicker: b.leadKicker ?? defaultBlogContent.leadKicker,
    gridTitle: b.gridTitle ?? defaultBlogContent.gridTitle,
    emptyText: b.emptyText ?? defaultBlogContent.emptyText,
    newsletter: { ...defaultBlogContent.newsletter, ...(b.newsletter ?? {}) },
  };
};

export const blogContentToBlocks = (content: BlogContent) => ({
  masthead: content.masthead,
  trendingTitle: content.trendingTitle,
  leadEyebrow: content.leadEyebrow,
  leadKicker: content.leadKicker,
  gridTitle: content.gridTitle,
  emptyText: content.emptyText,
  newsletter: content.newsletter,
});
