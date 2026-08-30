import Blog from "@/views/Blog";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
import { getBlogPosts } from "@/lib/cms/blogPosts";
import { blocksToBlogContent } from "@/data/blogContent";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function BlogPage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "blog")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load blog page CMS content:", error);
  }

  // Unpublished in the CMS: RLS returns no row to an anonymous reader, so an
  // absent row with no error means a super admin drafted this page.
  if (pageIsDrafted(data, error)) notFound();

  const chrome = blocksToBlogContent(data?.blocks);
  const posts = await getBlogPosts();

  return <Blog chrome={chrome} posts={posts} />;
}
