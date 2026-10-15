import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Platform-wide digital healthcare brochure slides (/brochure).
 * Global table: no tenant_id, super_admin writes, public reads published slides.
 */

const slideType = z.enum(["cover", "overview", "doctor", "hospital", "pathology", "pharmacy", "custom"]);
const slideStatus = z.enum(["published", "draft", "archived"]);

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((value) => (value === "" || value == null ? null : value));

export const brochureSlideCreateSchema = z.object({
  position: z.coerce.number().int().default(0),
  type: slideType.default("custom"),
  title: z.string().trim().min(1, "Title is required").max(300),
  subtitle: z.string().trim().max(1000).optional().default(""),
  badge: z.string().trim().max(100).optional().default(""),
  tagline: z.string().trim().max(500).optional().default(""),
  features: z.array(z.string()).default([]),
  highlight_badge: z.record(z.any()).nullable().optional(),
  image: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
  cta_label: optionalText,
  cta_url: optionalText,
  status: slideStatus.default("published"),
});

export const brochureSlideUpdateSchema = brochureSlideCreateSchema.partial();

export type BrochureSlideCreate = z.infer<typeof brochureSlideCreateSchema>;
export type BrochureSlideUpdate = z.infer<typeof brochureSlideUpdateSchema>;

export const brochureResource: ResourceDefinition<BrochureSlideCreate, BrochureSlideUpdate> = {
  name: "brochure",
  table: "brochure_slides",
  tenantScoped: false,
  createSchema: brochureSlideCreateSchema,
  updateSchema: brochureSlideUpdateSchema,
  searchFields: ["title", "subtitle", "badge", "tagline"],
  filterFields: ["status", "type"],
  defaultSort: { column: "position", ascending: true },
  roles: {
    read: ["super_admin"],
    write: ["super_admin"],
  },
};
