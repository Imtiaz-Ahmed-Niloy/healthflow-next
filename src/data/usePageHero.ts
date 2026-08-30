import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { blocksToHero, defaultCmsHero, heroToBlocks, type CmsHeroFields, type CmsHeroKey } from "@/data/cmsPageHero";
import { pathForSlug } from "@/constants/sitePages";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

const titleFor: Record<CmsHeroKey, string> = {
  features: "Features",
  about: "About",
  contact: "Contact",
};

/**
 * DB-backed hero for a single cms_pages row (slug === pageKey). Saves merge
 * onto the row's current blocks so this never clobbers sections another
 * editor on the same page already saved (e.g. FeaturesPageEditor's
 * architecture/logic/core blocks).
 */
export const usePageHero = (pageKey: CmsHeroKey) => {
  const listResult = cmsPagesApi.useList({ filters: { slug: pageKey }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToHero(row?.blocks, pageKey), [row?.blocks, pageKey]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: CmsHeroFields) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...heroToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: pageKey, path: pathForSlug(pageKey), title: titleFor[pageKey], blocks, published: true }).unwrap();
    }
  };

  const save = (next: CmsHeroFields) => persist(next);
  const reset = () => persist(defaultCmsHero[pageKey]);

  return { content, save, reset };
};
