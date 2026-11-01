import { z } from "zod";
import type { ResourceDefinition } from "./types";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.string().trim().max(4000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const otScheduleCreateSchema = z.object({
  ot_id: z.string().uuid("An Operation Theatre is required"),
  patient_id: z.string().uuid("A patient is required"),
  doctor_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  anesthesiologist_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),
  surgery_name: z.string().trim().min(1, "Surgery name is required").max(200),
  start_time: z.string().trim().min(1, "Start time is required"),
  end_time: z.preprocess(blankToUndefined, z.string().trim().nullable().optional()),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "delayed"]).optional().default("scheduled"),
  anesthesia_type: z.enum(["General", "Spinal", "Local", "Sedation", "Epidural", "None"]).optional().default("General"),
  pre_op_notes: optionalText,
  post_op_notes: optionalText,
});

export const otScheduleUpdateSchema = otScheduleCreateSchema.partial();

export type OtScheduleCreate = z.infer<typeof otScheduleCreateSchema>;
export type OtScheduleUpdate = z.infer<typeof otScheduleUpdateSchema>;

export const otSchedulesResource: ResourceDefinition<OtScheduleCreate, OtScheduleUpdate> = {
  name: "ot-schedules",
  table: "ot_schedules",
  tenantScoped: true,
  createSchema: otScheduleCreateSchema,
  updateSchema: otScheduleUpdateSchema,
  searchFields: ["surgery_name", "pre_op_notes"],
  filterFields: ["ot_id", "patient_id", "doctor_id", "status"],
  defaultSort: { column: "start_time", ascending: false },
};

