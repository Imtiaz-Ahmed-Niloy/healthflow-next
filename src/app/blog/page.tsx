import Blog from "@/views/Blog";
import { createPublicSupabase } from "@/lib/supabase/server";
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

  const chrome = blocksToBlogContent(data?.blocks);

  return <Blog chrome={chrome} />;
}
