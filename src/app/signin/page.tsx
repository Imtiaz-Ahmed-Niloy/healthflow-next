import { Suspense } from "react";
import SignIn from "@/views/SignIn";
import { createPublicSupabase } from "@/lib/supabase/server";
import type { SigninAd } from "@/views/SignIn";

/**
 * The promotional cards are data now (0064), so this reads them and hands
 * them down. Fetched on the server with the public client, so the policy
 * decides what is live rather than a filter the browser could drop.
 *
 * Revalidated every five minutes: a promotion that changes is not urgent, and
 * the sign-in page should not hit the database on every load.
 */
export const revalidate = 300;

const loadAds = async (): Promise<SigninAd[]> => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("ads")
    .select("id, side, position, badge, badge_tone, title, body, image_url, link_url")
    // One table serves every surface (0065); this page wants its own.
    .eq("placement", "signin")
    .order("position", { ascending: true });

  if (error) {
    // The sign-in form matters; the advertising beside it does not. A failure
    // here renders the page without cards rather than not at all.
    console.error("Failed to load sign-in ads:", error);
    return [];
  }
  return (data ?? []) as SigninAd[];
};

/**
 * SignIn reads ?next= via useSearchParams, which Next 15 requires to sit
 * inside a Suspense boundary — without one the build fails while
 * prerendering this route.
 */
const Page = async () => {
  const ads = await loadAds();
  return (
    <Suspense fallback={null}>
      <SignIn ads={ads} />
    </Suspense>
  );
};

export default Page;
