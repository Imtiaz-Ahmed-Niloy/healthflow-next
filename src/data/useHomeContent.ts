import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { blocksToHomeContent, defaultHomeContent, homeContentToBlocks, type HomeContent } from "@/data/homeContent";
import { pathForSlug } from "@/constants/sitePages";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

export const useHomeContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "home" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToHomeContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const save = async (next: HomeContent) => {
    const blocks = homeContentToBlocks(next);
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "home", path: pathForSlug("home"), title: "Home", blocks, published: true }).unwrap();
    }
  };

  const reset = async () => {
    const blocks = homeContentToBlocks(defaultHomeContent);
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "home", path: pathForSlug("home"), title: "Home", blocks, published: true }).unwrap();
    }
  };

  return { content, save, reset };
};
