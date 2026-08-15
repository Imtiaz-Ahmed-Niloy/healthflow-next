import Index from "@/views/Index";
import { createPublicSupabase } from "@/lib/supabase/server";
import { blocksToHomeContent } from "@/data/homeContent";

// Revalidate the homepage every 60s. Edits in the CMS show up within a minute
// without needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "home")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load homepage CMS content:", error);
  }

  const homeContent = blocksToHomeContent(data?.blocks);

  return <Index homeContent={homeContent} />;
}
