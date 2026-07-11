import { useEffect, useState } from "react";
import { posts as defaultPosts, categories as defaultCategories, type Post } from "@/data/blog";

export type { Post };

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
  categories: string[];
  posts: Post[];
};

const STORAGE_KEY = "hf:cms-blog:v1";
const EVENT = "hf:cms-blog:changed";

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
  categories: defaultCategories,
  posts: defaultPosts,
};

const read = (): BlogContent => {
  if (typeof window === "undefined") return defaultBlogContent;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBlogContent;
    const p = JSON.parse(raw) as Partial<BlogContent>;
    return {
      masthead: { ...defaultBlogContent.masthead, ...(p.masthead ?? {}) },
      trendingTitle: p.trendingTitle ?? defaultBlogContent.trendingTitle,
      leadEyebrow: p.leadEyebrow ?? defaultBlogContent.leadEyebrow,
      leadKicker: p.leadKicker ?? defaultBlogContent.leadKicker,
      gridTitle: p.gridTitle ?? defaultBlogContent.gridTitle,
      emptyText: p.emptyText ?? defaultBlogContent.emptyText,
      newsletter: { ...defaultBlogContent.newsletter, ...(p.newsletter ?? {}) },
      categories: p.categories ?? defaultBlogContent.categories,
      posts: p.posts ?? defaultBlogContent.posts,
    };
  } catch { return defaultBlogContent; }
};
const write = (c: BlogContent) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); window.dispatchEvent(new Event(EVENT)); };

export const useBlogContent = () => {
  const [content, setContent] = useState<BlogContent>(() => read());
  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return { content, save: write, reset: () => write(defaultBlogContent) };
};

export const getBlogPost = (slug: string) => read().posts.find(p => p.slug === slug);
