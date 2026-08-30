"use client";

import { createResourceApi } from "@/redux/api/createResourceApi";
import type { BlogPost, BlogPostInsert, BlogPostUpdate } from "@/data/blogPost";

/**
 * The blog's articles, for the CMS editor.
 *
 * These used to live in localStorage under "hf:cms-blog:v1", seeded from a
 * hardcoded array. The public /blog read the same key, so an article written
 * here existed only in the browser that wrote it — no visitor, and no other
 * admin, ever saw it. Now both sides read cms_blog_posts.
 *
 * The public pages do NOT use this hook: they are server components and fetch
 * through `lib/cms/blogPosts.ts` so the articles are in the HTML.
 */

const blogPostsApi = createResourceApi<BlogPost, BlogPostInsert, BlogPostUpdate>("cms-blog-posts");

export const useBlogPosts = () => {
  const { data, isLoading, isError } = blogPostsApi.useList({ limit: 100 });
  const [create, createState] = blogPostsApi.useCreate();
  const [update, updateState] = blogPostsApi.useUpdate();
  const [remove, removeState] = blogPostsApi.useRemove();

  const posts = data?.data ?? [];

  /**
   * Move the lead story. The current lead is cleared first: the table has a
   * unique index allowing one featured row, so setting the new one first
   * would be rejected.
   */
  const setFeatured = async (post: BlogPost) => {
    const current = posts.find((p) => p.featured);
    if (current && current.id !== post.id) {
      await update(current.id, { featured: false }).unwrap();
    }
    if (!post.featured) await update(post.id, { featured: true }).unwrap();
  };

  return {
    posts,
    isLoading,
    isError,
    isSaving: createState.isLoading || updateState.isLoading || removeState.isLoading,
    create: (body: BlogPostInsert) => create(body).unwrap(),
    update: (id: string, body: BlogPostUpdate) => update(id, body).unwrap(),
    remove: (id: string) => remove(id).unwrap(),
    setFeatured,
  };
};
