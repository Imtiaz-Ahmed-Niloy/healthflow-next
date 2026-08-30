import "server-only";

import { createPublicSupabase } from "@/lib/supabase/server";
import type { BlogPost } from "@/data/blogPost";

/**
 * Server-side reads of the blog, for the public pages.
 *
 * Anonymous visitors can select every row (`cms_blog_posts_public_read`) —
 * the blog is marketing, it must not need a login. Writes are super_admin
 * only, and that is enforced by RLS, not here.
 */

/** Newest first. 200 is well past anything the blog holds today. */
export const getBlogPosts = async (): Promise<BlogPost[]> => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    // An empty blog renders its own empty state; a thrown error would 500 the
    // page for every visitor.
    console.error("Failed to load blog posts:", error);
    return [];
  }

  return data;
};

export const getBlogPost = async (slug: string): Promise<BlogPost | null> => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load blog post "${slug}":`, error);
    return null;
  }

  return data;
};
