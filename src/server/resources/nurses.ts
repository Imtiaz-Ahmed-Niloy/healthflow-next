import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Nurses — served at /api/v1/nurses, stored in `public.nurses`.
 *
 * The Directory tab of /admin/nurses, and the list the other three tabs hang
 * off. Department Allocation is a view over `ward`, so moving a nurse between
 * wards is a PATCH to this resource rather than a module of its own.
 */

export const NURSE_SHIFTS = ["Morning", "Evening", "Night"] as const;
export const NURSE_STATUSES = ["active", "on_leave", "suspended"] as const;

/**
 * `ward` is free text here on purpose — see 0014_nurses.sql. The list the form
 * offers lives in the view, because it is a UI convenience, not a constraint.
 */

/**
 * "" means the field was emptied on purpose, so it maps to null. `undefined`
 * would mean "leave this alone" — PATCH drops undefined keys, so without this
 * a cleared licence or phone number could never save as cleared.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);

const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

export const nurseCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  ward: nullableText(120),
  shift: z.enum(NURSE_SHIFTS).optional(),
  license: nullableText(80),
  phone: nullableText(50),
  email: z.preprocess(
    blankToNull,
    z.string().trim().email("Enter a valid email address").nullable().optional(),
  ),
  /** Number fields arrive from forms as strings; "" means not stated. */
  experience_years: z.preprocess(
    blankToNull,
    z.coerce.number().int().min(0, "Cannot be negative").nullable().optional(),
  ),
  qualification: nullableText(200),
  status: z.enum(NURSE_STATUSES).optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const nurseUpdateSchema = nurseCreateSchema.partial();

export type NurseCreate = z.infer<typeof nurseCreateSchema>;
export type NurseUpdate = z.infer<typeof nurseUpdateSchema>;

export const nursesResource: ResourceDefinition<NurseCreate, NurseUpdate> = {
  name: "nurses",
  table: "nurses",
  tenantScoped: true,
  createSchema: nurseCreateSchema,
  updateSchema: nurseUpdateSchema,
  searchFields: ["name", "ward", "license", "qualification", "email"],
  filterFields: ["status", "ward", "shift"],
  defaultSort: { column: "name", ascending: true },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
