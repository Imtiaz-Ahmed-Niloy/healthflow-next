import Features from "@/views/Features";
import { createPublicSupabase } from "@/lib/supabase/server";
import { blocksToFeaturesContent } from "@/data/featuresContent";
import { blocksToHero } from "@/data/cmsPageHero";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function FeaturesPage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "features")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load features page CMS content:", error);
  }

  const hero = blocksToHero(data?.blocks, "features");
  const content = blocksToFeaturesContent(data?.blocks);

  return <Features hero={hero} content={content} />;
}
