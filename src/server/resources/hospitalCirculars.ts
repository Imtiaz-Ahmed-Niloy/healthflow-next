import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalDate = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
);

export const hospitalCircularCreateSchema = z.object({
  circular_number: z.string().trim().min(1, "Circular / Memo number is required").max(60),
  title: z.string().trim().min(1, "Title is required").max(255),
  category: z.enum([
    "administrative",
    "clinical_protocol",
    "emergency",
    "holiday_policy",
    "infection_control",
    "general",
  ]).default("administrative"),
  priority: z.enum(["normal", "urgent", "critical"]).default("normal"),
  target_audience: z.enum([
    "all_staff",
    "doctors_only",
    "nurses_only",
    "administrative",
    "clinical_staff",
  ]).default("all_staff"),
  published_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  valid_until: optionalDate,
  content: z.string().trim().min(1, "Notice / circular content is required").max(10000),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export const hospitalCircularUpdateSchema = hospitalCircularCreateSchema.partial();

export type HospitalCircularCreate = z.infer<typeof hospitalCircularCreateSchema>;
export type HospitalCircularUpdate = z.infer<typeof hospitalCircularUpdateSchema>;

export const hospitalCircularsResource: ResourceDefinition<HospitalCircularCreate, HospitalCircularUpdate> = {
  name: "hospital-circulars",
  table: "hospital_circulars",
  tenantScoped: true,
  createSchema: hospitalCircularCreateSchema,
  updateSchema: hospitalCircularUpdateSchema,
  searchFields: ["circular_number", "title", "content"],
  filterFields: ["category", "priority", "target_audience", "status"],
  defaultSort: { column: "published_date", ascending: false },
};

