import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Personal & confidential files — /api/v1/personal-files,
 * `public.personal_files` (0062).
 *
 * The hospital's document shelf: contracts, licences, policies, staff
 * paperwork. A row is the index card; the document itself lives in R2 and the
 * row holds its object key.
 */

/** An HTML form posts "" for anything left alone; the column should stay null. */
const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());

export const personalFileCreateSchema = z.object({
  folder: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()),
  title: z.string().trim().min(1, "File name is required").max(300),
  owner: optionalText,

  /**
   * The R2 key, written by the upload field. Capped short because a key is
   * short — a data URL pasted in by an older client is refused rather than
   * stored, which is the mistake this column exists to avoid.
   */
  file_key: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
  /** null clears it — the document was removed. "" means the form left it alone. */
  size_bytes: z.preprocess(
    value => (value === "" ? undefined : value),
    z.coerce.number().int().positive().nullable().optional(),
  ),

  status: z.enum(["active", "draft", "archived"]).optional(),
  notes: optionalText,
});

export const personalFileUpdateSchema = personalFileCreateSchema.partial();

export type PersonalFileCreate = z.infer<typeof personalFileCreateSchema>;
export type PersonalFileUpdate = z.infer<typeof personalFileUpdateSchema>;

export const personalFilesResource: ResourceDefinition<
  PersonalFileCreate,
  PersonalFileUpdate
> = {
  name: "personal-files",
  table: "personal_files",
  tenantScoped: true,

  createSchema: personalFileCreateSchema,
  updateSchema: personalFileUpdateSchema,

  searchFields: ["title", "folder", "owner"],
  filterFields: ["status", "folder"],
  defaultSort: { column: "updated_at", ascending: false },

  /**
   * Kept in step with the role gate in 0062. This returns a clean 403; the
   * RESTRICTIVE policy is what actually stops a doctor reading the shelf,
   * including through PostgREST directly.
   */
  roles: {
    read: ["hospital_admin", "hr_admin"],
    write: ["hospital_admin", "hr_admin"],
  },
};
