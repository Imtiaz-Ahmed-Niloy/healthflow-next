import type { MetadataRoute } from "next";
import { createPublicSupabase } from "@/lib/supabase/server";
import { MANAGED_PATHS } from "@/constants/sitePages";
import { slugify } from "@/lib/slug";

// Rebuilt at most hourly: new doctors, hospitals and articles reach search
// engines within the hour without a request to the database per crawl.
export const revalidate = 3600;

/** Managed pages that are not content: nothing to rank, and robots.ts blocks them. */
const ACCOUNT_PATHS = new Set(["/signin", "/signup"]);

/**
 * /sitemap.xml — every public page a visitor can actually open.
 *
 * Everything is read as an anonymous visitor, so RLS decides what is listed:
 * a drafted CMS page, an unpublished article, a suspended hospital or doctor
 * drops out on its own, the same way it drops out of the site. Nothing here
 * has to be edited when a page is published or taken down.
 *
 * `lastModified` is given only where there is a real edit date. Hospitals and
 * doctors carry only a creation date, and a sitemap that claims "changed
 * today" for every page teaches crawlers to ignore the field.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://healthflowbd.com";
  const supabase = createPublicSupabase();

  const [pagesResult, postsResult, hospitalsResult, doctorsResult] = await Promise.all([
    supabase.from("cms_pages").select("path, updated_at"),
    supabase.from("cms_blog_posts").select("slug, updated_at"),
    supabase.from("hospitals_public").select("id, slug, name"),
    supabase.from("doctors_public").select("slug, person_slug"),
  ]);

  for (const [what, result] of Object.entries({
    pages: pagesResult, posts: postsResult, hospitals: hospitalsResult, doctors: doctorsResult,
  })) {
    if (result.error) console.error(`Sitemap: failed to load ${what}:`, result.error);
  }

  // If the register could not be read, list every managed page rather than
  // none — the pages still guard themselves, and an empty sitemap is worse.
  const published = pagesResult.error
    ? new Map<string, string | undefined>(MANAGED_PATHS.map((path) => [path, undefined]))
    : new Map<string, string | undefined>((pagesResult.data ?? []).map((row) => [row.path, row.updated_at]));

  const isPublished = (path: string) => published.has(path);

  const pages: MetadataRoute.Sitemap = MANAGED_PATHS
    .filter((path) => !ACCOUNT_PATHS.has(path) && isPublished(path))
    .map((path) => ({
      url: `${baseUrl}${path === "/" ? "" : path}`,
      lastModified: published.get(path),
      changeFrequency: path === "/" ? "daily" : "monthly",
      priority: path === "/" ? 1 : 0.8,
    }));

  // A drafted /blog takes its articles down with it (app/blog/[slug]), so the
  // articles follow the list page here too; the same for the directories.
  const posts: MetadataRoute.Sitemap = isPublished("/blog")
    ? (postsResult.data ?? []).map((post) => ({
        url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
        lastModified: post.updated_at,
        changeFrequency: "monthly",
        priority: 0.6,
      }))
    : [];

  // The same slug the hospital pages resolve: the column, or one made from the
  // name when a row has none (useHospitals). Deduplicated like the directory.
  const hospitalSlugs = isPublished("/hospitals")
    ? new Set(
        (hospitalsResult.data ?? [])
          .map((h) => h.slug || slugify(h.name || h.id || ""))
          .filter(Boolean),
      )
    : new Set<string>();

  // One page per doctor: a doctor listed at several hospitals has a row for
  // each, all sharing `person_slug` (0090). The per-row slugs only redirect.
  const doctorSlugs = isPublished("/doctors")
    ? new Set(
        (doctorsResult.data ?? [])
          .map((d) => d.person_slug || d.slug)
          .filter((slug): slug is string => Boolean(slug)),
      )
    : new Set<string>();

  const profiles = (prefix: string, slugs: Set<string>): MetadataRoute.Sitemap =>
    [...slugs].map((slug) => ({
      // Slugs made from Bangla names are not ASCII; a sitemap URL must be.
      url: `${baseUrl}${prefix}/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [
    ...pages,
    ...profiles("/hospitals", hospitalSlugs),
    ...profiles("/doctors", doctorSlugs),
    ...posts,
  ];
};

export default sitemap;
