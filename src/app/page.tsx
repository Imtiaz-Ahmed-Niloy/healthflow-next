import Index from "@/views/Index";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/server";
import { pageIsDrafted } from "@/lib/cms/pages";
import { blocksToHomeContent } from "@/data/homeContent";
import { blocksToPricingContent } from "@/data/pricingContent";
import type { Announcement } from "@/data/announcements";

// Revalidate the homepage every 60s. Edits in the CMS -- and newly published
// announcements -- show up within a minute without needing a redeploy or a
// cache purge.
export const revalidate = 60;

export default async function HomePage() {
  const supabase = createPublicSupabase();

  const [homeResult, pricingResult, announcementsResult] = await Promise.all([
    supabase.from("cms_pages").select("blocks").eq("slug", "home").eq("published", true).maybeSingle(),
    supabase.from("cms_pages").select("blocks").eq("slug", "pricing").eq("published", true).maybeSingle(),
    // RLS hands `anon` only the published rows; the status filter is here so
    // the query says what it means rather than relying on the policy alone.
    supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  if (homeResult.error) {
    console.error("Failed to load homepage CMS content:", homeResult.error);
  }
  if (pricingResult.error) {
    console.error("Failed to load pricing CMS content for the homepage teaser:", pricingResult.error);
  }
  if (announcementsResult.error) {
    console.error("Failed to load announcements for the homepage popup:", announcementsResult.error);
  }

  // Only the home row gates this route. A drafted /pricing should take the
  // pricing page down, not the homepage that happens to tease it — the teaser
  // falls back to its defaults instead.
  if (pageIsDrafted(homeResult.data, homeResult.error)) notFound();

  const homeContent = blocksToHomeContent(homeResult.data?.blocks);
  const pricingPlans = blocksToPricingContent(pricingResult.data?.blocks).plans;
  const announcements = (announcementsResult.data ?? []) as Announcement[];

  return (
    <Index homeContent={homeContent} pricingPlans={pricingPlans} announcements={announcements} />
  );
}
