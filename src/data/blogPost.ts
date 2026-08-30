import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";

/**
 * One article on the public blog, straight off the table.
 *
 * There is no mapping layer on purpose: the editor form posts these field
 * names to the API unchanged, so a rename in the migration surfaces here as a
 * type error rather than as a field that silently stops saving.
 */
export type BlogPost = Tables<"cms_blog_posts">;
export type BlogPostInsert = TablesInsert<"cms_blog_posts">;
export type BlogPostUpdate = TablesUpdate<"cms_blog_posts">;

/** "2026-05-02" → "May 2, 2026". Kept identical to the old hardcoded labels. */
export const formatPostDate = (published_at: string): string => {
  const date = new Date(`${published_at}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? published_at
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** Today, as the date input and the API both want it. */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);
