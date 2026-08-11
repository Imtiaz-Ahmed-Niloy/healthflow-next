import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Hospitals — served at /api/v1/hospitals, stored in `public.tenants`.
 *
 * The table holds EVERY hospital in Bangladesh, not only paying customers.
 * Most rows are directory data; `status` separates a plain listing from an
 * approved partner. Only approved rows are visible publicly, through the
 * `hospitals_public` view — never through this route.
 *
 * See docs/superpowers/specs/2026-08-11-super-hospitals-design.md
 */

/** Treats "" from an HTML form the same as omitted. */
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Number fields arrive from forms as strings. */
const optionalNumber = z.coerce.number().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/** Date inputs post "" when cleared. */
const optionalDate = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

/**
 * The form collects these as repeatable text inputs; Postgres holds text[].
 * A single string is accepted and wrapped, so a plain input still works.
 */
const optionalTextArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const list = (Array.isArray(value) ? value : [value])
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  });

/** [{ platform, url }] — an array of objects, so jsonb rather than columns. */
const socialSchema = z
  .array(z.object({ platform: z.string().trim().min(1), url: z.string().trim().min(1) }))
  .optional();

/** [{ name, role, phone, email }] — likewise jsonb. */
const managementBodySchema = z
  .array(
    z.object({
      name: z.string().trim().min(1),
      role: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
    }),
  )
  .optional();

export const hospitalCreateSchema = z.object({
  // The only two required fields. Everything else is optional so a directory
  // row can be captured from partial public information.
  name: z.string().trim().min(1, "Hospital name is required").max(200),
  trade_license: z.string().trim().min(1, "Trade licence number is required").max(120),

  // directory
  tagline: optionalText,
  location: optionalText,
  region: optionalText,
  division: optionalText,
  district: optionalText,
  subdistrict: optionalText,
  address: optionalText,
  logo_url: optionalText,
  cover_image_url: optionalText,

  // scale
  beds: optionalNumber,
  doctor_count: optionalNumber,
  founded_year: optionalNumber,
  rating: z.coerce.number().min(0).max(5).optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  reviews_count: optionalNumber,

  // descriptive
  specialties: optionalText,
  certifications: optionalText,
  opening_hours: optionalText,
  facilities: optionalText,
  awards: optionalText,
  summary: optionalText,
  about: optionalText,

  // contact — contact_email/contact_phone are the canonical single values that
  // provisioning sends credentials to; the arrays are the extras.
  contact_email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  contact_phone: optionalText,
  additional_emails: optionalTextArray,
  additional_phones: optionalTextArray,
  websites: optionalTextArray,
  social: socialSchema,

  // registration / licences
  tin: optionalText,
  bin: optionalText,
  operating_license: optionalText,
  other_licenses: optionalText,

  // owner
  owner_name: optionalText,
  ownership_type: optionalText,
  owner_nid: optionalText,
  owner_email: z.string().trim().email().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  owner_phone: optionalText,
  owner_address: optionalText,
  owner_since: optionalDate,

  // management body
  chairman: optionalText,
  ceo: optionalText,
  medical_director: optionalText,
  management_body: managementBodySchema,
  board_notes: optionalText,

  // lifecycle
  status: z.enum(["pending", "approved", "suspended"]).optional(),
  package_id: z.string().uuid().optional().or(z.literal("")).transform(
    (value) => (value === "" ? undefined : value),
  ),
  created_at: optionalDate,

  // `slug` is deliberately absent. It is not null unique and is derived by the
  // tenants_set_slug trigger in 0008. Accepting it from a client would let one
  // hospital claim another's public URL.
});

export const hospitalUpdateSchema = hospitalCreateSchema.partial();

export type HospitalCreate = z.infer<typeof hospitalCreateSchema>;
export type HospitalUpdate = z.infer<typeof hospitalUpdateSchema>;

export const hospitalsResource: ResourceDefinition<HospitalCreate, HospitalUpdate> = {
  name: "hospitals",
  table: "tenants",

  // `tenants` is scoped by `id`, not `tenant_id` — it IS the tenant. If this
  // were true the factory would stamp a tenant_id column that does not exist
  // and every insert would fail.
  tenantScoped: false,

  createSchema: hospitalCreateSchema,
  updateSchema: hospitalUpdateSchema,
  searchFields: ["name", "region", "location"],
  filterFields: ["status", "division", "district", "subdistrict", "package_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // A hospital_admin reads their own hospital; RLS (0002) is what limits them
    // to it. Nobody else has business in the admin list.
    read: ["hospital_admin"],
    // Empty means "super_admin only" — canWrite returns early for super_admin
    // and an empty list matches no other role.
    write: [],
  },
};
