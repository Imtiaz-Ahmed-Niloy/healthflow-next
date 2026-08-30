import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The public blog's articles. Global, like cms_pages — one publication for
 * the whole platform, not one per hospital.
 */

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Number fields arrive from forms as strings. */
const optionalNumber = z.coerce.number().int().min(0).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const cmsBlogPostCreateSchema = z.object({
  // Lower-case, hyphenated: this lands in the URL as /blog/<slug>.
  slug: z.string().trim().min(1).max(120).regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lower-case letters, numbers and hyphens",
  ),
  title: z.string().trim().min(1, "Title is required").max(200),
  dek: optionalText,
  category: optionalText,
  cover: optionalText,
  author: optionalText,
  author_photo: optionalText,
  author_role: optionalText,
  // One string per paragraph, in reading order.
  body: z.array(z.string()).max(200).optional(),
  published_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
  read_time: optionalNumber,
  views: optionalNumber,
  featured: z.coerce.boolean().optional(),
});

export const cmsBlogPostUpdateSchema = cmsBlogPostCreateSchema.partial();

export type CmsBlogPostCreate = z.infer<typeof cmsBlogPostCreateSchema>;
export type CmsBlogPostUpdate = z.infer<typeof cmsBlogPostUpdateSchema>;

export const cmsBlogPostsResource: ResourceDefinition<CmsBlogPostCreate, CmsBlogPostUpdate> = {
  name: "cms-blog-posts",
  table: "cms_blog_posts",
  tenantScoped: false, // global table
  createSchema: cmsBlogPostCreateSchema,
  updateSchema: cmsBlogPostUpdateSchema,
  searchFields: ["title", "author", "dek"],
  filterFields: ["category", "slug", "featured"],
  defaultSort: { column: "published_at", ascending: false },
  roles: {
    // Everyone reads the blog; the public site reads it without a session at
    // all, straight through RLS.
    read: ["super_admin", "hospital_admin", "hr_admin", "doctor", "patient"],
    write: ["super_admin"],
  },
};
