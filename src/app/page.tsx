import Index from "@/views/Index";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
import { blocksToHomeContent } from "@/data/homeContent";
import { blocksToPricingContent } from "@/data/pricingContent";

// Revalidate the homepage every 60s. Edits in the CMS show up within a minute
// without needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createPublicSupabase();

  const [homeResult, pricingResult] = await Promise.all([
    supabase.from("cms_pages").select("blocks").eq("slug", "home").eq("published", true).maybeSingle(),
    supabase.from("cms_pages").select("blocks").eq("slug", "pricing").eq("published", true).maybeSingle(),
  ]);

  if (homeResult.error) {
    console.error("Failed to load homepage CMS content:", homeResult.error);
  }
  if (pricingResult.error) {
    console.error("Failed to load pricing CMS content for the homepage teaser:", pricingResult.error);
  }

  // Only the home row gates this route. A drafted /pricing should take the
  // pricing page down, not the homepage that happens to tease it — the teaser
  // falls back to its defaults instead.
  if (pageIsDrafted(homeResult.data, homeResult.error)) notFound();

  const homeContent = blocksToHomeContent(homeResult.data?.blocks);
  const pricingPlans = blocksToPricingContent(pricingResult.data?.blocks).plans;

  return <Index homeContent={homeContent} pricingPlans={pricingPlans} />;
}
