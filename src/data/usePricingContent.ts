import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { pathForSlug } from "@/constants/sitePages";
import {
  blocksToPricingContent,
  defaultPricingContent,
  pricingContentToBlocks,
  type PricingContent,
} from "@/data/pricingContent";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

export const usePricingContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "pricing" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToPricingContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: PricingContent) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...pricingContentToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "pricing", path: pathForSlug("pricing"), title: "Pricing", blocks, published: true }).unwrap();
    }
  };

  const save = (next: PricingContent) => persist(next);
  const reset = () => persist(defaultPricingContent);

  return { content, save, reset };
};
