import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import { pathForSlug } from "@/constants/sitePages";
import {
  blocksToContactContent,
  defaultContactContent,
  contactContentToBlocks,
  type ContactContent,
} from "@/data/contactContent";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

/**
 * The contact row also carries a `hero` block, written independently by
 * usePageHero. Saves here merge onto the row's current blocks rather than
 * replacing them, so this hook never clobbers what the hero tab just saved.
 */
export const useContactContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "contact" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToContactContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: ContactContent) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...contactContentToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "contact", path: pathForSlug("contact"), title: "Contact", blocks, published: true }).unwrap();
    }
  };

  const save = (next: ContactContent) => persist(next);
  const reset = () => persist(defaultContactContent);

  return { content, save, reset };
};
