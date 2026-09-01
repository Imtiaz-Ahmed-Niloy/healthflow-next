import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Roles — served at /api/v1/roles, stored in `public.roles`.
 *
 * Two kinds of row live here (see 0009_roles_management.sql):
 *
 *   system   `role` is one of the app_role enum values. Seeded, protected by
 *            a trigger, and the only kind a user can actually hold.
 *   custom   `role` is null. A saved page-access template. It cannot be
 *            assigned until app_role gains a matching value.
 *
 * `role` and `is_system` are deliberately absent from the schemas below, so a
 * client can neither mint a row claiming to be `super_admin` nor forge the
 * protection that makes a row undeletable. Both are also blocked in the
 * database — this just turns a 500 into a clean 422.
 */

/**
 * "" means the field was emptied on purpose, so it maps to null. `undefined`
 * would mean "leave this alone" — PATCH drops undefined keys, so without this
 * a cleared description could never be saved as cleared.
 */
const blankToNull = (value: unknown) => (value === "" ? null : value);
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const roleCreateSchema = z.object({
  /**
   * The hospital this role belongs to (0055).
   *
   * Optional here and required by the factory: `tenantScoped: true` makes a
   * super_admin — the only writer this table has — pass one explicitly, and a
   * missing tenant is then a clean 422 rather than the check constraint's
   * 23514. System roles are seeded, never created through this endpoint, so
   * "no hospital" is not a case a caller can be in.
   */
  tenant_id: z.preprocess(blankToUndefined, z.string().uuid("Select a hospital").optional()),

  label: z.string().trim().min(1, "Role name is required").max(120),
  description: z.preprocess(blankToNull, z.string().trim().max(2000).nullable().optional()),
  scope: z.enum(["Platform", "Tenant", "Clinical", "Self"]).default("Tenant"),

  /**
   * Panel paths this role may open. Mirrors the check constraint's absence in
   * 0009: paths are validated for shape, not against a catalogue, because the
   * catalogue ships with the frontend and moves every release.
   */
  pages: z.array(z.string().trim().startsWith("/")).default([]),
});

/**
 * `tenant_id` is dropped rather than made optional: which hospital a role
 * belongs to is settled when it is created. Moving one afterwards would carry
 * its page grants into a hospital that never asked for them, and would leave
 * whoever holds it in the old hospital pointing at a role they can no longer
 * see. Delete and recreate is the honest way to do that.
 */
export const roleUpdateSchema = roleCreateSchema.partial().omit({ tenant_id: true });

export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;

export const rolesResource: ResourceDefinition<RoleCreate, RoleUpdate> = {
  name: "roles",
  table: "roles",

  /**
   * True since 0055. A custom role belongs to the hospital that asked for it,
   * so the factory demands a tenant_id from the super_admin creating it and
   * refuses to let a PATCH move a role between hospitals.
   *
   * The eight system rows carry no tenant and are not created here — they are
   * the app_role enum, and only their page grants are editable.
   */
  tenantScoped: true,

  createSchema: roleCreateSchema,
  updateSchema: roleUpdateSchema,

  /** The screen names the hospital a custom role belongs to. */
  select: "*, tenants ( id, name, slug )",

  searchFields: ["label", "description"],
  filterFields: ["scope", "is_system", "tenant_id"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // No read gate. Every panel renders a permission matrix, so every signed-in
    // role needs this list; what each of them may see is RLS's job, and since
    // 0055 that is the system roles plus their own hospital's. A role gate here
    // would hide the list from panels that need it, not tighten anything.
    //
    // Empty write means super_admin only.
    write: [],
  },
};
