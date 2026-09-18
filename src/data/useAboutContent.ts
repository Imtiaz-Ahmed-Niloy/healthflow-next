import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { pathForSlug } from "@/constants/sitePages";
import {
  blocksToAboutContent,
  defaultAboutFor,
  aboutContentToBlocks,
  type AboutContent,
} from "@/data/aboutContent";
import { mergeBlocksFor } from "@/data/cmsLocale";
import type { Locale } from "@/i18n/config";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

/**
 * The about row also carries a `hero` block, written independently by
 * usePageHero. Saves here merge onto the row's current blocks rather than
 * replacing them, so this hook never clobbers what the hero tab just saved —
 * nor the other language's copy (see cmsLocale).
 */
export const useAboutContent = (locale: Locale = "en") => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "about" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToAboutContent(row?.blocks, locale), [row?.blocks, locale]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: AboutContent) => {
    const blocks = mergeBlocksFor(row?.blocks, locale, aboutContentToBlocks(next));
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "about", path: pathForSlug("about"), title: "About", blocks, published: true }).unwrap();
    }
  };

  const save = (next: AboutContent) => persist(next);
  const reset = () => persist(defaultAboutFor(locale));

  return { content, save, reset };
};
