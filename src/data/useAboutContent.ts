import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import {
  blocksToAboutContent,
  defaultAboutContent,
  aboutContentToBlocks,
  type AboutContent,
} from "@/data/aboutContent";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

/**
 * The about row also carries a `hero` block, written independently by
 * usePageHero. Saves here merge onto the row's current blocks rather than
 * replacing them, so this hook never clobbers what the hero tab just saved.
 */
export const useAboutContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "about" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToAboutContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: AboutContent) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...aboutContentToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "about", title: "About", blocks, published: true }).unwrap();
    }
  };

  const save = (next: AboutContent) => persist(next);
  const reset = () => persist(defaultAboutContent);

  return { content, save, reset };
};
