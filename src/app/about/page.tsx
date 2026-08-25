import About from "@/views/About";
import { createPublicSupabase } from "@/lib/supabase/server";
import { blocksToAboutContent } from "@/data/aboutContent";
import { blocksToHero } from "@/data/cmsPageHero";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function AboutPage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "about")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load about page CMS content:", error);
  }

  const hero = blocksToHero(data?.blocks, "about");
  const content = blocksToAboutContent(data?.blocks);

  return <About hero={hero} content={content} />;
}
