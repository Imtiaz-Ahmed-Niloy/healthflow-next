import { createResourceApi } from "@/redux/api/createResourceApi";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { useMemo } from "react";
import {
  blocksToBlogContent,
  defaultBlogContent,
  blogContentToBlocks,
  type BlogContent,
} from "@/data/blogContent";

type CmsPageRow = Tables<"cms_pages">;
type CmsPageInsert = TablesInsert<"cms_pages">;
type CmsPageUpdate = TablesUpdate<"cms_pages">;

const cmsPagesApi = createResourceApi<CmsPageRow, CmsPageInsert, CmsPageUpdate>("cms-pages");

export const useBlogContent = () => {
  const listResult = cmsPagesApi.useList({ filters: { slug: "blog" }, limit: 1 });
  const row = listResult.data?.data?.[0];
  const content = useMemo(() => blocksToBlogContent(row?.blocks), [row?.blocks]);

  const [create] = cmsPagesApi.useCreate();
  const [update] = cmsPagesApi.useUpdate();

  const persist = async (next: BlogContent) => {
    const blocks = { ...(row?.blocks as Record<string, unknown> ?? {}), ...blogContentToBlocks(next) };
    if (row) {
      await update(row.id, { blocks }).unwrap();
    } else {
      await create({ slug: "blog", title: "Blog", blocks, published: true }).unwrap();
    }
  };

  const save = (next: BlogContent) => persist(next);
  const reset = () => persist(defaultBlogContent);

  return { content, save, reset };
};
