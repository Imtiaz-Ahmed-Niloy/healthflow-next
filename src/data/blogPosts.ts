import { useEffect, useState } from "react";
import { posts as defaultPosts, categories as defaultCategories, type Post } from "@/data/blog";

export type { Post };

/**
 * Individual post authoring is out of scope for the cms_pages migration —
 * tracked separately as cms_blog_posts. This stays on localStorage until
 * that table exists.
 */
export type BlogPostsData = {
  categories: string[];
  posts: Post[];
};

const STORAGE_KEY = "hf:cms-blog:v1";
const EVENT = "hf:cms-blog:changed";

export const defaultBlogPosts: BlogPostsData = {
  categories: defaultCategories,
  posts: defaultPosts,
};

const read = (): BlogPostsData => {
  if (typeof window === "undefined") return defaultBlogPosts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBlogPosts;
    const p = JSON.parse(raw) as Partial<BlogPostsData>;
    return {
      categories: p.categories ?? defaultBlogPosts.categories,
      posts: p.posts ?? defaultBlogPosts.posts,
    };
  } catch { return defaultBlogPosts; }
};
const write = (c: BlogPostsData) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); window.dispatchEvent(new Event(EVENT)); };

export const useBlogPosts = () => {
  const [content, setContent] = useState<BlogPostsData>(() => read());
  useEffect(() => {
    const sync = () => setContent(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return { content, save: write, reset: () => write(defaultBlogPosts) };
};

export const getBlogPost = (slug: string) => read().posts.find(p => p.slug === slug);
