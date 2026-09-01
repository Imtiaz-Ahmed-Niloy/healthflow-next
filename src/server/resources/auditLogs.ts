import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Audit log — served at /api/v1/audit-logs, stored in `public.audit_logs`.
 *
 * Read-only, and that is not a convention here but the design: the rows are
 * written by a database trigger (0058), and the table carries no insert,
 * update or delete policy at all. Nobody can add an entry through this API,
 * and nobody — super admin included — can remove one. The route file exports
 * GET alone, so the other verbs are a 405 rather than a 403 that suggests the
 * right role would be enough.
 */

/**
 * Never used: there is no create or update path. The factory's type requires
 * schemas, so this is the honest one — an empty object that accepts nothing.
 */
const nothing = z.object({}).strict();

export type AuditLogWrite = z.infer<typeof nothing>;

export const auditLogsResource: ResourceDefinition<AuditLogWrite, AuditLogWrite> = {
  name: "audit-logs",
  table: "audit_logs",

  // Entries carry a tenant_id, but nothing stamps one: the trigger takes it
  // from the row that changed. There is no write path for this to apply to.
  tenantScoped: false,

  createSchema: nothing,
  updateSchema: nothing,

  /**
   * No embed, and none is possible: `audit_logs` has no foreign keys, so
   * PostgREST has no relationship to follow and `tenants ( … )` answers
   * PGRST200. The hospital's name is on the row itself, copied at write time —
   * an audit entry has to outlive the thing it describes, and a reference
   * would either block deleting a hospital or cascade its history away.
   */

  // The actor's email is the one people actually search for — "what did
  // this person change?" — then the table, then the hospital.
  searchFields: ["actor_email", "table_name", "tenant_name"],
  filterFields: ["action", "table_name", "actor_id", "tenant_id", "record_id"],
  defaultSort: { column: "occurred_at", ascending: false },

  roles: {
    // Empty read means super_admin only, matching the policy. A hospital admin
    // reading their own hospital's trail is a reasonable thing to want later;
    // it is a policy change plus this line, not a rewrite.
    read: [],
    write: [],
  },
};
