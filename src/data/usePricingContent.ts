import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { pathForSlug } from "@/constants/sitePages";
import {
  blocksToPricingContent,
  defaultPricingFor,
  pricingContentToBlocks,
  type PricingContent,
} from "@/data/pricingContent";
import { mergeBlocksFor } from "@/data/cmsLocale";
import type { Locale } from "@/i18n/config";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

/**
 * The pricing page in one language. Saving writes that language only (see
 * cmsLocale); in Bangla the prices come from English whatever is saved here.
 */
export const usePricingContent = (locale: Locale = "en") => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "pricing" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToPricingContent(row?.blocks, locale), [row?.blocks, locale]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: PricingContent) => {
    const blocks = mergeBlocksFor(row?.blocks, locale, pricingContentToBlocks(next));
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "pricing", path: pathForSlug("pricing"), title: "Pricing", blocks, published: true }).unwrap();
    }
  };

  const save = (next: PricingContent) => persist(next);
  const reset = () => persist(defaultPricingFor(locale));

  return { content, save, reset };
};
