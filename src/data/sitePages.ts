"use client";

import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesUpdate } from "@/lib/supabase/types";

/**
 * The CMS page register, read from `cms_pages`.
 *
 * This used to be a localStorage store seeded with a hardcoded array: "New
 * Page", the publish pill and delete all wrote to whichever browser happened
 * to be open, no other admin ever saw the result, and nothing on the public
 * site read any of it — so the publish toggle changed precisely nothing.
 *
 * Now every row is a route that actually exists (see 0040), and unpublishing
 * one hides it for real.
 */

export type SitePage = Tables<"cms_pages">;

const cmsPagesApi = createResourceApi<SitePage, never, TablesUpdate<"cms_pages">>("cms-pages");

export const useSitePages = () => {
  // 19 built-in routes today, and MAX_LIMIT is 100. One page of results.
  const { data, isLoading, isError, refetch } = cmsPagesApi.useList({
    limit: 100,
    sort: "path",
    order: "asc",
  });
  const [update, updateState] = cmsPagesApi.useUpdate();

  const pages = data?.data ?? [];

  /** Publish or unpublish. The database refuses this on a protected page. */
  const setPublished = (page: SitePage, published: boolean) =>
    update(page.id, { published }).unwrap();

  const rename = (page: SitePage, title: string) => update(page.id, { title }).unwrap();

  return { pages, isLoading, isError, isSaving: updateState.isLoading, refetch, setPublished, rename };
};
