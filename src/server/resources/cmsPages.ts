import { z } from "zod";
import type { ResourceDefinition } from "./types";

export const cmsPageCreateSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  blocks: z.record(z.unknown()).default({}),
  published: z.boolean().optional(),
});

export const cmsPageUpdateSchema = cmsPageCreateSchema.partial();

export type CmsPageCreate = z.infer<typeof cmsPageCreateSchema>;
export type CmsPageUpdate = z.infer<typeof cmsPageUpdateSchema>;

export const cmsPagesResource: ResourceDefinition<CmsPageCreate, CmsPageUpdate> = {
  name: "cms-pages",
  table: "cms_pages",
  tenantScoped: false,  // global table
  createSchema: cmsPageCreateSchema,
  updateSchema: cmsPageUpdateSchema,
  searchFields: ["slug", "title"],
  filterFields: ["slug", "published"],
  defaultSort: { column: "updated_at", ascending: false },
  roles: {
    read: ["super_admin", "hospital_admin", "hr_admin", "doctor", "patient"],
    write: ["super_admin"],
  },
};