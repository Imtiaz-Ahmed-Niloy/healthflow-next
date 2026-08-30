import Contact from "@/views/Contact";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
import { blocksToContactContent } from "@/data/contactContent";
import { blocksToHero } from "@/data/cmsPageHero";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function ContactPage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "contact")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load contact page CMS content:", error);
  }

  // Unpublished in the CMS: RLS returns no row to an anonymous reader, so an
  // absent row with no error means a super admin drafted this page.
  if (pageIsDrafted(data, error)) notFound();

  const hero = blocksToHero(data?.blocks, "contact");
  const content = blocksToContactContent(data?.blocks);

  return <Contact hero={hero} content={content} />;
}
