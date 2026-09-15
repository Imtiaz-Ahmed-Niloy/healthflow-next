import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The hospital's notice board (0073).
 *
 * Two resources rather than one, mirroring the two tables: the event belongs
 * to the hospital, the read receipt belongs to a person. See the migration for
 * why a `read` flag on the event itself would be wrong.
 */

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const NOTIFICATION_TONES = ["info", "ok", "warn", "bad"] as const;

/**
 * The kinds the app raises today.
 *
 * The column takes any lowercase slug — a new kind is deliberately not a
 * migration — but the API only accepts one of these, so a typo at a call site
 * is a 422 rather than a row nobody can filter for. Adding a kind is adding a
 * line here and an icon in the view.
 */
export const NOTIFICATION_KINDS = [
  "patient.admitted",
  "patient.discharged",
  "patient.transferred",
  "appointment.booked",
  "requisition.raised",
  "requisition.approved",
  "work_order.created",
  "invoice.paid",
  "certificate.issued",
  "lab.result_ready",
  "stock.low",
] as const;

export const notificationCreateSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS),
  title: z.string().trim().min(1, "A notification needs a title").max(200),
  body: z.preprocess(blankToUndefined, z.string().trim().max(2000).nullable().optional()),
  tone: z.enum(NOTIFICATION_TONES).optional(),

  /**
   * What it is about, so the feed can link to it. Both or neither: half a
   * reference is a link to nowhere, and the check is here rather than in the
   * database because it is a shape rule about the API, not an invariant of
   * the stored row — an older row may legitimately carry neither.
   */
  entity_type: z.preprocess(blankToUndefined, z.string().trim().regex(/^[a-z_]{1,60}$/).nullable().optional()),
  entity_id: z.preprocess(blankToUndefined, z.string().uuid().nullable().optional()),

  // tenant_id is deliberately absent: the route stamps it from the JWT.
}).refine(
  v => (v.entity_type == null) === (v.entity_id == null),
  { message: "Give both entity_type and entity_id, or neither", path: ["entity_id"] },
);

export const notificationUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.preprocess(blankToUndefined, z.string().trim().max(2000).nullable().optional()),
  tone: z.enum(NOTIFICATION_TONES).optional(),
});

export type NotificationCreate = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof notificationUpdateSchema>;

/** Every role the /admin panel lets in (src/proxy.ts), and no other. */
const ADMIN_ROLES = [
  "hospital_admin", "hr_admin", "finance_admin", "lab_admin", "pharmacy_admin",
] as const;

export const notificationsResource: ResourceDefinition<
  NotificationCreate,
  NotificationUpdate
> = {
  name: "notifications",
  table: "notifications",
  tenantScoped: true,
  createSchema: notificationCreateSchema,
  updateSchema: notificationUpdateSchema,
  select: "*, notification_reads(id, profile_id, read_at)",
  searchFields: ["title", "body"],
  filterFields: ["kind", "tone", "entity_type", "entity_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: [...ADMIN_ROLES],
    write: [...ADMIN_ROLES],
  },
};

// ------------------------------------------------------------- the reads ---

export const notificationReadCreateSchema = z.object({
  notification_id: z.string().uuid("Which notification?"),
  // profile_id is absent on purpose: ownerColumn stamps it from the session.
});

export type NotificationReadCreate = z.infer<typeof notificationReadCreateSchema>;

/**
 * There is nothing on a read receipt worth changing — you have read it or you
 * have not — so PATCH accepts the same shape with everything optional and, in
 * practice, does nothing. The route factory wants an update schema; this is
 * the honest one rather than a second set of fields nobody sends.
 */
export const notificationReadsResource: ResourceDefinition<
  NotificationReadCreate,
  Partial<NotificationReadCreate>
> = {
  name: "notification-reads",
  table: "notification_reads",
  tenantScoped: true,
  /** Stamped from the session — see ResourceDefinition.ownerColumn. */
  ownerColumn: "profile_id",
  createSchema: notificationReadCreateSchema,
  updateSchema: notificationReadCreateSchema.partial(),
  filterFields: ["notification_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: [...ADMIN_ROLES],
    write: [...ADMIN_ROLES],
  },
};
