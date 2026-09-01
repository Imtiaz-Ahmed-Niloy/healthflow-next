import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Support tickets — served at /api/v1/support-tickets, stored in
 * `public.support_tickets`.
 *
 * A hospital asking the platform for help: an outage, a billing dispute, a
 * "how do I bulk-import doctors?". Raised by a hospital admin, triaged by the
 * support desk on /super/tickets.
 */

const blankToNull = (value: unknown) => (value === "" ? null : value);
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const supportTicketCreateSchema = z.object({
  /**
   * Present, like hospital-packages and unlike most modules, because the
   * triage screen is a super_admin one: `tenantScoped: true` makes the factory
   * demand a tenant_id from a super_admin, who is filing on a hospital's
   * behalf and so picks it.
   *
   * Optional rather than required because a hospital_admin raising their own
   * ticket never sends one — the factory stamps it from their JWT and a body
   * field cannot override it. A super_admin who forgets still gets the
   * factory's clean 422 rather than a not-null violation.
   */
  tenant_id: z.preprocess(blankToUndefined, z.string().uuid("Select a hospital").optional()),

  subject: z.string().trim().min(1, "Subject is required").max(200),

  details: z.preprocess(blankToNull, z.string().trim().max(5000).nullable().optional()),

  assignee: z.preprocess(blankToNull, z.string().trim().max(200).nullable().optional()),

  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["pending", "processing", "resolved"]).optional(),
});

export const supportTicketUpdateSchema = supportTicketCreateSchema.partial();

export type SupportTicketCreate = z.infer<typeof supportTicketCreateSchema>;
export type SupportTicketUpdate = z.infer<typeof supportTicketUpdateSchema>;

export const supportTicketsResource: ResourceDefinition<
  SupportTicketCreate,
  SupportTicketUpdate
> = {
  name: "support-tickets",
  table: "support_tickets",

  /**
   * True. The rows carry a tenant_id, so this is what stamps a hospital
   * admin's own hospital on create and stops a tenant_id in the body moving a
   * ticket between hospitals on a PATCH.
   */
  tenantScoped: true,

  createSchema: supportTicketCreateSchema,
  updateSchema: supportTicketUpdateSchema,

  /** The triage table shows which hospital raised each ticket. */
  select: "*, tenants ( id, name, slug )",

  /**
   * Subject and assignee only. The hospital name is the other thing worth
   * searching and it lives on the embedded `tenants` row, which PostgREST's
   * `or` filter cannot reach into — same limitation as hospital-packages, and
   * the view filters client-side for it.
   */
  searchFields: ["subject", "assignee"],
  filterFields: ["status", "priority", "tenant_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // A hospital_admin raises and reads their own tickets; RLS is what limits
    // them to their own. super_admin passes every gate and triages all of them.
    read: ["hospital_admin"],
    write: ["hospital_admin"],
  },
};
