import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/credentials";
import { fail, fromRpc, json, pharmacyAdministrator, readJson } from "@/server/pharmacy";
import { accessSchema, saveStaffArgs } from "@/server/pharmacyStaff";

/**
 * PATCH /api/v1/pharmacy/staff/:id — one pharmacy login.
 *
 *   { action: "save", staff_role, branch_id, can_*, pin?, clear_pin? }
 *                                  what they are and what they may do
 *   { action: "reset_password" }   a new password, answered once
 *   { action: "deactivate" }       signs them out everywhere and stops the login
 *   { action: "activate" }         lets a deactivated login back in
 *
 * The target is looked up in pharmacy_staff_list first, which answers only
 * for the caller's own hospital and only to someone who administers its
 * pharmacy: a login anywhere else is simply not found. Only then does the
 * service-role client act.
 */

const actionSchema = z.discriminatedUnion("action", [
  accessSchema.extend({ action: z.literal("save") }),
  z.object({ action: z.enum(["reset_password", "deactivate", "activate"]) }),
]);

type Context = { params: Promise<{ id: string }> };
type StaffRow = { id: string; email: string | null; is_active: boolean };

export const PATCH = async (request: Request, context: Context) => {
  const who = await pharmacyAdministrator();
  if ("refusal" in who) return who.refusal;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Not found", 404);

  const parsed = actionSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  const list = await who.supabase.rpc("pharmacy_staff_list");
  if (list.error) return fromRpc(list.error);

  const profile = ((list.data ?? []) as StaffRow[]).find(row => row.id === id);
  if (!profile) return fail("Not found", 404);

  if (body.action === "save") {
    const { error } = await who.supabase.rpc("pharmacy_save_staff", saveStaffArgs(profile.id, body));
    if (error) return fromRpc(error);

    return json({ data: { id: profile.id } });
  }

  // Nobody locks themselves out of the panel they are standing in.
  if (body.action === "deactivate" && profile.id === who.auth.userId) {
    return fail("You cannot deactivate your own login.", 422, { code: "own_access" });
  }

  const admin = createAdminSupabase();

  if (body.action === "reset_password") {
    const password = generatePassword(12);
    const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
    if (error) return fail(`Could not reset the password: ${error.message}`, 400);

    return json({ data: { id: profile.id, email: profile.email, password } });
  }

  if (body.action === "deactivate") {
    const { error } = await admin.rpc("revoke_staff_access", { p_profile_id: profile.id });
    if (error) return fail(error.message, 500);

    return json({ data: { id: profile.id, is_active: false } });
  }

  const { error } = await admin.rpc("restore_staff_access", {
    p_profile_id: profile.id,
    // pharmacyAccess has already refused a login with no hospital.
    p_tenant_id: who.auth.tenantId as string,
    p_role: "pharmacy_admin",
  });
  if (error) return fail(error.message, 500);

  return json({ data: { id: profile.id, is_active: true } });
};
