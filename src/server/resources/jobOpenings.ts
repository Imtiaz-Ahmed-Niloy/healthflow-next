import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.string().trim().max(4000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);
const optionalDate = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
);

export const jobOpeningCreateSchema = z.object({
  job_title: z.string().trim().min(1, "Job title is required").max(200),
  department: z.string().trim().min(1, "Department is required").max(100),
  employment_type: z.enum(["full_time", "part_time", "contract", "locum", "intern"]).default("full_time"),
  experience_required: optionalText,
  vacancies: z.coerce.number().int().min(1, "Must have at least 1 vacancy").default(1),
  closing_date: optionalDate,
  job_description: optionalText,
  requirements: optionalText,
  status: z.enum(["draft", "active", "interviewing", "closed", "cancelled"]).default("active"),
});

export const jobOpeningUpdateSchema = jobOpeningCreateSchema.partial();

export type JobOpeningCreate = z.infer<typeof jobOpeningCreateSchema>;
export type JobOpeningUpdate = z.infer<typeof jobOpeningUpdateSchema>;

export const jobOpeningsResource: ResourceDefinition<JobOpeningCreate, JobOpeningUpdate> = {
  name: "job-openings",
  table: "job_openings",
  tenantScoped: true,
  createSchema: jobOpeningCreateSchema,
  updateSchema: jobOpeningUpdateSchema,
  searchFields: ["job_title", "department", "job_description", "requirements"],
  filterFields: ["department", "employment_type", "status"],
  defaultSort: { column: "created_at", ascending: false },
};

