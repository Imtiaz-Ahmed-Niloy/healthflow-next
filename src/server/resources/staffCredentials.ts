import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);
const optionalDate = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
);

export const staffCredentialCreateSchema = z.object({
  employee_id: z.string().uuid("Pick an employee"),
  title: z.string().trim().min(1, "Title is required").max(200),
  credential_type: z.enum([
    "medical_license",
    "nursing_license",
    "clinical_certification",
    "life_support",
    "fellowship",
    "other",
  ]).default("medical_license"),
  registration_number: z.string().trim().min(1, "Registration / License number is required").max(100),
  issuing_authority: z.string().trim().min(1, "Issuing authority is required").max(150),
  issue_date: optionalDate,
  expiry_date: optionalDate,
  verification_status: z.enum(["pending", "verified", "expired", "rejected"]).optional().default("pending"),
  document_url: optionalText,
  notes: optionalText,
});

export const staffCredentialUpdateSchema = staffCredentialCreateSchema.partial();

export type StaffCredentialCreate = z.infer<typeof staffCredentialCreateSchema>;
export type StaffCredentialUpdate = z.infer<typeof staffCredentialUpdateSchema>;

export const staffCredentialsResource: ResourceDefinition<StaffCredentialCreate, StaffCredentialUpdate> = {
  name: "staff-credentials",
  table: "staff_credentials",
  tenantScoped: true,
  createSchema: staffCredentialCreateSchema,
  updateSchema: staffCredentialUpdateSchema,
  select: "*, employees ( id, name, emp_id, department, designation )",
  searchFields: ["title", "registration_number", "issuing_authority", "notes"],
  filterFields: ["employee_id", "credential_type", "verification_status"],
  defaultSort: { column: "expiry_date", ascending: true },
};

