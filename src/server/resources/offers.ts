import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Offers — served at /api/v1/offers, stored in `public.offers`.
 *
 * Platform-wide discount codes. An offer either applies to one plan or to all
 * of them; `package_id = null` is the "all plans" case, which is why the field
 * is nullable rather than optional — the UI has to be able to clear it, and a
 * dropped key would leave the old plan attached.
 */

/**
 * "" means the user chose the blank option and wants the column emptied, so it
 * maps to null. `undefined` would mean "leave this alone", which is the
 * opposite instruction.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);

export const offerCreateSchema = z.object({
  /**
   * Uppercased here rather than in the form, so a code typed into any client
   * lands the same way. The column is unique — a duplicate is a clean 409 from
   * the factory's 23505 mapping.
   */
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(60)
    .transform((value) => value.toUpperCase()),

  label: z.string().trim().max(200).optional(),

  discount_pct: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),

  // null = applies to every plan.
  package_id: z.preprocess(blankToNull, z.string().uuid().nullable().optional()),

  valid_until: z.preprocess(blankToNull, z.string().trim().nullable().optional()),

  active: z.boolean().optional(),
});

export const offerUpdateSchema = offerCreateSchema.partial();

export type OfferCreate = z.infer<typeof offerCreateSchema>;
export type OfferUpdate = z.infer<typeof offerUpdateSchema>;

export const offersResource: ResourceDefinition<OfferCreate, OfferUpdate> = {
  name: "offers",
  table: "offers",
  tenantScoped: false,
  createSchema: offerCreateSchema,
  updateSchema: offerUpdateSchema,

  // Embeds the plan so the table can show "Professional" instead of a uuid.
  select: "*, packages ( id, name, slug )",

  searchFields: ["code", "label"],
  filterFields: ["active", "package_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Readable by any signed-in user, matching the RLS policy: a hospital
    // admin needs to see the offer applied to their own bill.
    write: [],
  },
};
