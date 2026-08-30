import { z } from "zod";
import type { ResourceDefinition } from "./types";

export const cmsPageCreateSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  blocks: z.record(z.unknown()).default({}),
  published: z.boolean().optional(),
});

/**
 * Slug is deliberately not updatable.
 *
 * Every page editor and every public route looks its content up by slug
 * ("blog", "features"), so renaming one through the API would silently
 * detach a live page from its content. Titles are what a super admin
 * actually wants to edit, and those are free.
 *
 * `path`, `built_in` and `protected` are absent from both schemas for the
 * same reason, plus one more: `protected` is what stops sign-in being
 * unpublished, and a flag that guards access should not be editable by the
 * thing it guards against.
 */
export const cmsPageUpdateSchema = cmsPageCreateSchema.partial().omit({ slug: true });

export type CmsPageCreate = z.infer<typeof cmsPageCreateSchema>;
export type CmsPageUpdate = z.infer<typeof cmsPageUpdateSchema>;

export const cmsPagesResource: ResourceDefinition<CmsPageCreate, CmsPageUpdate> = {
  name: "cms-pages",
  table: "cms_pages",
  tenantScoped: false,  // global table
  createSchema: cmsPageCreateSchema,
  updateSchema: cmsPageUpdateSchema,
  searchFields: ["slug", "title", "path"],
  filterFields: ["slug", "published", "path"],
  defaultSort: { column: "updated_at", ascending: false },
  roles: {
    read: ["super_admin", "hospital_admin", "hr_admin", "doctor", "patient"],
    write: ["super_admin"],
  },
};