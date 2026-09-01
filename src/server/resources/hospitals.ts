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

/**
 * An HTML form posts "" for every field the user left alone, and the column
 * should stay null rather than becoming an empty string or a zero.
 *
 * This runs BEFORE coercion, which matters for numbers: `z.coerce.number()`
 * turns "" into 0, so an untouched "Total beds" would be saved as a hospital
 * with zero beds instead of an unknown bed count.
 */
const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());
const optionalNumber = z.preprocess(blankToUndefined, z.coerce.number().optional());
const optionalDate = z.preprocess(blankToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(blankToUndefined, z.string().trim().email().optional());

/**
 * Weekly operating hours.
 *
 * Mirrors public.is_operating_hours in 0054 and src/lib/hours.ts. All three
 * say the same thing on purpose: the database is the boundary, this turns a
 * malformed week into a clean 422 instead of a 23514 surfaced as
 * "Invalid values", and hours.ts is what the browser edits.
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z.union([
  z.object({
    mode: z.literal("hours"),
    open: z.string().regex(TIME, "Opening time must be HH:MM"),
    close: z.string().regex(TIME, "Closing time must be HH:MM"),
  }),
  z.object({ mode: z.literal("24h") }),
  z.object({ mode: z.literal("closed") }),
]);

const weekSchema = z
  .object({
    sun: dayHoursSchema.optional(),
    mon: dayHoursSchema.optional(),
    tue: dayHoursSchema.optional(),
    wed: dayHoursSchema.optional(),
    thu: dayHoursSchema.optional(),
    fri: dayHoursSchema.optional(),
    sat: dayHoursSchema.optional(),
  })
  // strict, so a typo'd day key is rejected rather than silently stored and
  // then never read back. The check constraint refuses it too; this is the
  // half that produces a sentence a human can act on.
  .strict()
  .refine(week => Object.keys(week).length > 0, "Set hours for at least one day");

/**
 * The form posts one hidden input, so the week arrives as a JSON string. An
 * API client may send the object directly. Both are accepted; anything that
 * is neither is a 422 rather than a cast error from Postgres.
 */
const operatingHours = z.preprocess(value => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    // Left as the original string so the union below fails with a message
    // about the shape rather than throwing here.
    return value;
  }
}, weekSchema.nullable().optional());

/**
 * The form collects these as repeatable text inputs; Postgres holds text[].
 * A single string is accepted and wrapped, so a plain input still works.
 */
const optionalTextArray = z.preprocess(
  blankToUndefined,
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const list = (Array.isArray(value) ? value : [value])
        .map((item) => item.trim())
        .filter(Boolean);
      return list.length ? list : undefined;
    }),
);

/**
 * [{ platform, url }] and [{ name, role, phone, email }] — arrays of objects, so
 * jsonb rather than columns.
 *
 * Blank rows are DROPPED, not rejected. The repeatable widgets always render one
 * empty row, and PeopleField pre-selects a role on it, so an untouched
 * "Management body" section posts [{ name: "", role: "Chairman" }]. Rejecting
 * that would 422 every create where the user never opened step 2.
 */
const socialSchema = z.preprocess(
  blankToUndefined,
  z
    .array(z.object({ platform: z.string().trim().optional(), url: z.string().trim() }))
    .optional()
    .transform((list) => {
      const kept = list?.filter((s) => s.url) ?? [];
      return kept.length ? kept : undefined;
    }),
);

const managementBodySchema = z.preprocess(
  blankToUndefined,
  z
    .array(
      z.object({
        name: z.string().trim(),
        role: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        email: z.string().trim().optional(),
      }),
    )
    .optional()
    .transform((list) => {
      const kept = list?.filter((m) => m.name) ?? [];
      return kept.length ? kept : undefined;
    }),
);

export const hospitalCreateSchema = z.object({
  // The only three required fields. Everything else is optional so a directory
  // row can be captured from partial public information.
  name: z.string().trim().min(1, "Hospital name is required").max(200),
  trade_license: z.string().trim().min(1, "Trade licence number is required").max(120),
  address: z.string().trim().min(1, "Full address is required").max(2000),

  // directory
  tagline: optionalText,
  location: optionalText,
  region: optionalText,
  division: optionalText,
  district: optionalText,
  subdistrict: optionalText,
  logo_url: optionalText,
  cover_image_url: optionalText,

  // scale
  beds: optionalNumber,
  doctor_count: optionalNumber,
  founded_year: optionalNumber,
  // Mirrors the check constraint in 0008, so a bad value is a clean 422 rather
  // than a 23514 surfaced as "Invalid values".
  rating: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(5).optional()),
  reviews_count: optionalNumber,

  // descriptive
  specialties: optionalText,
  certifications: optionalText,
  opening_hours: operatingHours,
  facilities: optionalText,
  awards: optionalText,
  summary: optionalText,
  about: optionalText,

  // contact — contact_email/contact_phone are the canonical single values that
  // provisioning sends credentials to; the arrays are the extras.
  contact_email: optionalEmail,
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
  owner_email: optionalEmail,
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
  package_id: z.preprocess(blankToUndefined, z.string().uuid().optional()),
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
