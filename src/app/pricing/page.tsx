import Pricing from "@/views/Pricing";
import { createPublicSupabase } from "@/lib/supabase/server";
import { blocksToPricingContent } from "@/data/pricingContent";

// Revalidate every 60s. Edits in the CMS show up within a minute without
// needing a redeploy or a cache purge.
export const revalidate = 60;

export default async function PricingPage() {
  const supabase = createPublicSupabase();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("blocks")
    .eq("slug", "pricing")
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load pricing page CMS content:", error);
  }

  const content = blocksToPricingContent(data?.blocks);

  return <Pricing {...content} />;
}
