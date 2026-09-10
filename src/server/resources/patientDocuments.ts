import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * A patient's own medical paperwork — /api/v1/patient-documents,
 * `public.patient_documents` (0076).
 *
 * Prescriptions from other chambers, lab reports, scans, discharge summaries:
 * whatever the patient carries in, uploaded from /patient/medical-records.
 * The owner is stamped from the session (ownerColumn) and RLS shows a row to
 * that person alone, so this definition only has to describe the shape.
 */

export const PATIENT_DOCUMENT_KINDS = [
  "prescription", "lab_report", "imaging", "discharge_summary", "vaccination", "insurance", "other",
] as const;

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

export const patientDocumentCreateSchema = z.object({
  kind: z.enum(PATIENT_DOCUMENT_KINDS).default("other"),
  title: z.string().trim().min(1, "Give the document a name").max(200),
  /** An R2 object key from /api/v1/uploads (folder records/) — never a URL. */
  file_key: z.string().trim().regex(/^records\/\d{4}\/\d{2}\/[a-f0-9]{16}\.[a-z]+$/, "Upload the file first"),
  file_name: optionalText(200),
  content_type: optionalText(100),
  size_bytes: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  document_date: z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional()),
  notes: optionalText(1000),
});

/** The words and the type; the file itself is replaced by uploading anew. */
export const patientDocumentUpdateSchema = patientDocumentCreateSchema
  .pick({ kind: true, title: true, document_date: true, notes: true })
  .partial();

export const patientDocumentsResource: ResourceDefinition<
  z.infer<typeof patientDocumentCreateSchema>,
  z.infer<typeof patientDocumentUpdateSchema>
> = {
  name: "patient-documents",
  table: "patient_documents",
  // A person's paper, not a hospital's — no tenant_id (see 0076).
  tenantScoped: false,
  ownerColumn: "profile_id",
  createSchema: patientDocumentCreateSchema,
  updateSchema: patientDocumentUpdateSchema,
  searchFields: ["title", "file_name", "notes"],
  filterFields: ["kind"],
  defaultSort: { column: "created_at", ascending: false },
  roles: { read: ["patient"], write: ["patient"] },
};
