import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import {
  blocksToFeaturesContent,
  defaultFeaturesContent,
  featuresContentToBlocks,
  type FeaturesContent,
} from "@/data/featuresContent";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

/**
 * The features row also carries a `hero` block, written independently by
 * usePageHero. Saves here merge onto the row's current blocks rather than
 * replacing them, so this hook never clobbers what the hero tab just saved.
 */
export const useFeaturesContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "features" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToFeaturesContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: FeaturesContent) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...featuresContentToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "features", title: "Features", blocks, published: true }).unwrap();
    }
  };

  const save = (next: FeaturesContent) => persist(next);
  const reset = () => persist(defaultFeaturesContent);

  return { content, save, reset };
};
