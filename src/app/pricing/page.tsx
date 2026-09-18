import Pricing from "@/views/Pricing";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
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

  // Unpublished in the CMS: RLS returns no row to an anonymous reader, so an
  // absent row with no error means a super admin drafted this page.
  if (pageIsDrafted(data, error)) notFound();

  // The CMS keeps the page in both languages; render the visitor's.
  const content = blocksToPricingContent(data?.blocks, (await getLocale()) as Locale);

  return <Pricing {...content} />;
}
