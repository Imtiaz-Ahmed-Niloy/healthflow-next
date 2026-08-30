import About from "@/views/About";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
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

  // Unpublished in the CMS: RLS returns no row to an anonymous reader, so an
  // absent row with no error means a super admin drafted this page.
  if (pageIsDrafted(data, error)) notFound();

  const hero = blocksToHero(data?.blocks, "about");
  const content = blocksToAboutContent(data?.blocks);

  return <About hero={hero} content={content} />;
}
