import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Promotional cards — /api/v1/ads, `public.ads` (0064, generalised in 0065).
 *
 * `placement` says where a card is shown. Only the sign-in page draws them
 * today; the table is shaped so the home page or a portal can join without a
 * second table and a second admin screen.
 *
 * Platform-level, like packages: an ad belongs to the product, not to a
 * hospital. `tenantScoped` is false because there is no tenant_id to stamp.
 */

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());

export const adCreateSchema = z.object({
  placement: z.enum(["signin"]).optional(),
  side: z.enum(["left", "right"]),
  position: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(99).optional()),

  badge: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
  badge_tone: z.enum(["primary", "accent", "destructive", "muted"]).optional(),

  title: z.string().trim().min(1, "The card needs a title").max(120),
  body: z.preprocess(blankToUndefined, z.string().trim().max(400).optional()),

  /** An R2 key or a bundled /assets path — never a URL to somewhere else. */
  image_url: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
  link_url: optionalText,

  active: z.preprocess(
    value => (value === "" || value === undefined ? undefined : value === true || value === "true"),
    z.boolean().optional(),
  ),

  starts_on: z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  ends_on: z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export const adUpdateSchema = adCreateSchema.partial();

export type AdCreate = z.infer<typeof adCreateSchema>;
export type AdUpdate = z.infer<typeof adUpdateSchema>;

export const adsResource: ResourceDefinition<AdCreate, AdUpdate> = {
  name: "ads",
  table: "ads",
  tenantScoped: false,

  createSchema: adCreateSchema,
  updateSchema: adUpdateSchema,

  searchFields: ["title", "body", "badge"],
  filterFields: ["placement", "side", "active"],
  // The order the cards are drawn in, which is the order to edit them in.
  defaultSort: { column: "position", ascending: true },

  /**
   * Empty lists mean super_admin only, the same convention hospitals uses.
   * The pages that DISPLAY ads do not come through here: they read the live
   * rows straight from the anon-readable table (0064).
   */
  roles: { read: [], write: [] },
};
