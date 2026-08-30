import "server-only";

import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/server";

/**
 * Server-side reads of the CMS page register (`cms_pages`).
 *
 * Anonymous callers can only select rows where `published` is true — that is
 * the `cms_pages_public_read` policy from 0007 — so "the row came back" and
 * "this page is published" are the same statement here. No extra filter is
 * needed and none should be added: the database is the check.
 */

/**
 * Paths a visitor is allowed to see. Used to filter the nav.
 *
 * Cached for 60s to match the pages' own `revalidate`. The root layout awaits
 * this on every route in the app, so an uncached query here would opt the
 * whole site out of static rendering to answer a question that changes about
 * twice a year.
 */
export const getPublishedPaths = unstable_cache(
  async (): Promise<string[] | null> => {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase.from("cms_pages").select("path");

    if (error) {
      // null means "unknown", which the nav reads as "hide nothing" — an empty
      // array would mean "everything is drafted" and would strip every link
      // off a perfectly healthy site. The pages still guard their own access.
      console.error("Failed to load published page paths:", error);
      return null;
    }

    return data.map((row) => row.path);
  },
  ["cms-published-paths"],
  { revalidate: 60, tags: ["cms-pages"] },
);

/**
 * 404 the current route when its CMS row is unpublished.
 *
 * For the pages that already fetch their own `blocks`, pass what that query
 * returned instead of calling this — one round trip is enough. See
 * `pageIsDrafted`.
 */
export const requirePublishedPage = async (slug: string): Promise<void> => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("cms_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // Fail open, deliberately. A drafted page hidden is the feature; the whole
    // marketing site 404ing because the database hiccuped is not.
    console.error(`Failed to check whether "${slug}" is published:`, error);
    return;
  }

  if (!data) notFound();
};

/**
 * The same check for a page that has already run its own query: a missing row
 * with no error means RLS filtered it, which means it is drafted.
 */
export const pageIsDrafted = (row: unknown, error: unknown): boolean => !error && !row;
