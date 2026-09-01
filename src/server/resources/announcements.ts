import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Platform-wide broadcast announcements -- the pop-up the marketing site shows
 * visitors. Global, like cms_pages: no tenant_id, super_admin writes, everyone
 * (signed out included) reads the published ones.
 *
 * Copies the doctors.ts shape -- no queries, no auth checks, no filtering here,
 * just the shape. createResourceRoute and the RLS in 0053 do the rest.
 */

const announcementType = z.enum(["text", "image"]);
const announcementStatus = z.enum(["published", "draft", "archived"]);

/**
 * Optional free-text field. Trims, and treats both "" and null as "clear it"
 * so emptying the field in the editor nulls the column rather than being
 * dropped as a no-op.
 */
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((value) => (value === "" || value == null ? null : value));

export const announcementCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().max(5000).optional(),
  type: announcementType.optional(),
  status: announcementStatus.optional(),

  /**
   * A base64 data URL today, an R2 URL later (docs/image-uploads-r2.md).
   * Nullable so the editor can clear it; no length cap and no .trim() because
   * a ~2.7MB data URL has nothing to strip and the page enforces the 2MB
   * limit before the value gets here.
   */
  image: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),

  cta_label: optionalText,
  cta_url: optionalText,
  // tenant_id is deliberately absent: this table is global (see 0053).
});

export const announcementUpdateSchema = announcementCreateSchema.partial();

export type AnnouncementCreate = z.infer<typeof announcementCreateSchema>;
export type AnnouncementUpdate = z.infer<typeof announcementUpdateSchema>;

export const announcementsResource: ResourceDefinition<AnnouncementCreate, AnnouncementUpdate> = {
  name: "announcements",
  table: "announcements",
  tenantScoped: false, // global table -- platform-wide, like cms_pages and packages
  createSchema: announcementCreateSchema,
  updateSchema: announcementUpdateSchema,
  searchFields: ["title", "body"],
  filterFields: ["status", "type"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // This endpoint IS the super admin console. The public popup reads
    // published rows straight from the DB via createPublicSupabase
    // (src/app/page.tsx), not through here -- so a non-super caller gets a
    // clean 403 instead of a confusingly filtered list.
    read: ["super_admin"],
    write: ["super_admin"],
  },
};
