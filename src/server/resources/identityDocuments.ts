import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Identity papers — /api/v1/identity-documents, `public.identity_documents`
 * (0068).
 *
 * A patient uploads a birth certificate, NID or passport; a super admin checks
 * it and marks it verified or rejected. The badge on a patient's name is
 * derived from a verified row, never stored.
 *
 * Two callers, one table, and the database keeps them apart: RLS shows a
 * patient only their own rows, and the trigger in 0068 refuses a status change
 * from anyone but a super admin — so `status` being in the update schema below
 * is safe. It is the reviewer's field; a patient sending it gets an error from
 * Postgres rather than a quietly self-verified account.
 */

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const identityDocumentCreateSchema = z.object({
  kind: z.enum(["birth_certificate", "nid", "passport"]),
  /** Whose papers: the patient's own, or their emergency contact's (0070). */
  holder: z.enum(["self", "emergency_contact"]).default("self"),
  /** An R2 object key from /api/v1/uploads — never a URL, never the file. */
  file_key: z.string().trim().min(1, "Upload the document first").max(300),
  file_name: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
  /** What is printed on the paper: the NID, passport or certificate number. */
  document_number: z.preprocess(blankToUndefined, z.string().trim().max(60).optional()),
});

export const identityDocumentUpdateSchema = z.object({
  kind: z.enum(["birth_certificate", "nid", "passport"]).optional(),
  holder: z.enum(["self", "emergency_contact"]).optional(),
  file_key: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
  file_name: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
  // Changing it sends the document back for review, the same as a new file —
  // the trigger in 0069 does that, not this schema.
  document_number: z.preprocess(blankToUndefined, z.string().trim().max(60).nullable().optional()),

  /** The review. Refused by the database for anyone but a super admin. */
  status: z.enum(["pending", "verified", "rejected"]).optional(),
  review_note: z.preprocess(blankToUndefined, z.string().trim().max(1000).nullable().optional()),
});

export type IdentityDocumentCreate = z.infer<typeof identityDocumentCreateSchema>;
export type IdentityDocumentUpdate = z.infer<typeof identityDocumentUpdateSchema>;

export const identityDocumentsResource: ResourceDefinition<
  IdentityDocumentCreate,
  IdentityDocumentUpdate
> = {
  name: "identity-documents",
  table: "identity_documents",

  /**
   * False because the table has no tenant_id — this is between the person and
   * the platform. `profile_id` is defaulted by the route below rather than
   * accepted from the request, the same rule tenant_id follows everywhere.
   */
  tenantScoped: false,

  /** Stamped from the session on create — see ResourceDefinition.ownerColumn. */
  ownerColumn: "profile_id",

  createSchema: identityDocumentCreateSchema,
  updateSchema: identityDocumentUpdateSchema,

  /** The reviewer needs to know whose document this is. */
  select: "*, profiles ( id, full_name, email, phone, avatar_url )",

  searchFields: ["file_name", "document_number"],
  filterFields: ["status", "kind", "holder", "profile_id"],
  defaultSort: { column: "submitted_at", ascending: true },

  roles: {
    // A patient reads and writes their own; super_admin passes everywhere and
    // is the only one who can act on the status. No hospital role appears
    // here: a passport scan is identity evidence for the platform, not
    // clinical information.
    read: ["patient"],
    write: ["patient"],
  },
};
