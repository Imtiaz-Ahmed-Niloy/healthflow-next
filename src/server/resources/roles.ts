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

export const roleCreateSchema = z.object({
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

export const roleUpdateSchema = roleCreateSchema.partial();

export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;

export const rolesResource: ResourceDefinition<RoleCreate, RoleUpdate> = {
  name: "roles",
  table: "roles",

  // Global: a role describes the platform, not one hospital.
  tenantScoped: false,

  createSchema: roleCreateSchema,
  updateSchema: roleUpdateSchema,
  searchFields: ["label", "description"],
  filterFields: ["scope", "is_system"],
  defaultSort: { column: "label", ascending: true },
  roles: {
    // No read gate. RLS (0002) is `using (true)` for authenticated — every
    // panel renders a permission matrix, so every signed-in role needs this
    // list. Adding a gate here would contradict the policy, not tighten it.
    //
    // Empty write means super_admin only.
    write: [],
  },
};
