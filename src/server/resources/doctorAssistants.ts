import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Doctor assistants — served at /api/v1/doctor-assistants, stored in
 * `public.doctor_assistants`.
 *
 * The staff behind /admin/doctor-assistants. One row per assistant, each
 * optionally attached to a doctor.
 */

export const ASSISTANT_SHIFTS = ["Morning", "Evening", "Night"] as const;
export const ASSISTANT_STATUSES = ["active", "on_leave", "suspended"] as const;

/**
 * "" means the field was emptied on purpose, so it maps to null. `undefined`
 * would mean "leave this alone" — PATCH drops undefined keys, so without this
 * an assistant could never be unassigned from a doctor, nor a phone number
 * cleared, once either had been set.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);

const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

export const doctorAssistantCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),

  /**
   * Nullable, not optional-only. An assistant may be hired before they are
   * attached to a doctor, and the select on the form offers a blank option
   * for exactly that.
   */
  doctor_id: z.preprocess(
    blankToNull,
    z.string().uuid("Pick a doctor from the list").nullable().optional(),
  ),

  shift: z.enum(ASSISTANT_SHIFTS).optional(),
  phone: nullableText(50),
  email: z.preprocess(
    blankToNull,
    z.string().trim().email("Enter a valid email address").nullable().optional(),
  ),
  status: z.enum(ASSISTANT_STATUSES).optional(),
  notes: nullableText(2000),
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const doctorAssistantUpdateSchema = doctorAssistantCreateSchema.partial();

export type DoctorAssistantCreate = z.infer<typeof doctorAssistantCreateSchema>;
export type DoctorAssistantUpdate = z.infer<typeof doctorAssistantUpdateSchema>;

export const doctorAssistantsResource: ResourceDefinition<
  DoctorAssistantCreate,
  DoctorAssistantUpdate
> = {
  name: "doctor-assistants",
  table: "doctor_assistants",
  tenantScoped: true,
  createSchema: doctorAssistantCreateSchema,
  updateSchema: doctorAssistantUpdateSchema,

  // The table shows who each assistant supports, so carry the doctor along.
  select: "*, doctors ( id, name, specialty )",

  /**
   * The assigned doctor's name is deliberately not here. PostgREST's `or`
   * filter cannot reach into an embedded relation, so listing it would fail
   * rather than search. The page offers a doctor dropdown instead — see
   * DoctorAssistants.tsx.
   */
  searchFields: ["name", "phone", "email"],

  filterFields: ["status", "shift", "doctor_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin", "hr_admin"],
  },
};
