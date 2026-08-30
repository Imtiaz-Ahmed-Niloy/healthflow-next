import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Documents a hospital issues about a person (0049) — birth, death, fitness
 * and discharge for patients; experience, NOC, relieving and salary for staff.
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).nullable().optional());

export const CERTIFICATE_TYPES = [
  "birth", "death", "medical_fitness", "discharge", "vaccination", "disability",
  "experience", "noc", "relieving", "salary",
] as const;

export const CERTIFICATE_STATUSES = ["pending", "issued", "revoked"] as const;

export const certificateCreateSchema = z.object({
  certificate_no: z.string().trim().min(1, "Certificate number is required").max(100),
  type: z.enum(CERTIFICATE_TYPES),
  /**
   * The name is required and the links are not, on purpose: a hospital issues
   * certificates about people with no record in it — a relative collecting a
   * death certificate, a former employee asking for an experience letter years
   * later. The name is what gets printed.
   */
  recipient_name: z.string().trim().min(1, "Who is this for?").max(200),
  patient_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  employee_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  issued_by: optionalText,
  /**
   * Null while pending. The table refuses an issued certificate with no date —
   * a document with no date on it is not a document — so the page sends both
   * together.
   */
  issued_on: z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  details: optionalText,
  status: z.enum(CERTIFICATE_STATUSES).optional(),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const certificateUpdateSchema = certificateCreateSchema.partial();

export type CertificateCreate = z.infer<typeof certificateCreateSchema>;
export type CertificateUpdate = z.infer<typeof certificateUpdateSchema>;

export const certificatesResource: ResourceDefinition<CertificateCreate, CertificateUpdate> = {
  name: "certificates",
  table: "certificates",
  tenantScoped: true,
  createSchema: certificateCreateSchema,
  updateSchema: certificateUpdateSchema,
  searchFields: ["certificate_no", "recipient_name", "issued_by"],
  filterFields: ["type", "status"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Staff certificates include salary letters, so this is the same two desks
    // that hold the rest of the HR record. Matches the RLS gate in 0049.
    read: ["hospital_admin", "hr_admin"],
    write: ["hospital_admin", "hr_admin"],
  },
};
