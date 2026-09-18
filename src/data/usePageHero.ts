import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { blocksToHero, defaultHeroFor, heroToBlocks, type CmsHeroFields, type CmsHeroKey } from "@/data/cmsPageHero";
import { mergeBlocksFor } from "@/data/cmsLocale";
import { pathForSlug } from "@/constants/sitePages";
import type { Locale } from "@/i18n/config";

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
 *
 * `locale` picks which language's hero this reads and writes (see cmsLocale).
 */
export const usePageHero = (pageKey: CmsHeroKey, locale: Locale = "en") => {
  const listResult = cmsPagesApi.useList({ filters: { slug: pageKey }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToHero(row?.blocks, pageKey, locale), [row?.blocks, pageKey, locale]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: CmsHeroFields) => {
    const blocks = mergeBlocksFor(row?.blocks, locale, heroToBlocks(next));
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: pageKey, path: pathForSlug(pageKey), title: titleFor[pageKey], blocks, published: true }).unwrap();
    }
  };

  const save = (next: CmsHeroFields) => persist(next);
  const reset = () => persist(defaultHeroFor(pageKey, locale));

  return { content, save, reset };
};
