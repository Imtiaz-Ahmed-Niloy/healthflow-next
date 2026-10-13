import { z } from "zod";
import { provisionUser } from "@/server/provisioning";
import { fail, fromRpc, json, pharmacyAdministrator, readJson } from "@/server/pharmacy";
import { accessSchema, saveStaffArgs } from "@/server/pharmacyStaff";

/**
 * /api/v1/pharmacy/staff — the pharmacy's logins, and what each may do.
 *
 *   GET    everyone at this hospital who signs in to the pharmacy panel
 *   POST   create one; answers with the password, once
 *
 * For the hospital admin and for pharmacy staff who administer the pharmacy
 * (0131). Every pharmacy login carries the same role, pharmacy_admin; what
 * kind of login it is — manager, pharmacist, cashier, stock keeper — and its
 * permissions are a row in pharmacy_staff, written by pharmacy_save_staff.
 *
 * The login itself is created through provisionUser, the one place that makes
 * auth users, with the hospital taken from the caller's session: a body
 * cannot name another hospital to put the login in.
 */

const createSchema = accessSchema.extend({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional(),
});

export const GET = async () => {
  const who = await pharmacyAdministrator();
  if ("refusal" in who) return who.refusal;

  const { data, error } = await who.supabase.rpc("pharmacy_staff_list");
  if (error) return fromRpc(error);

  return json({ data });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAdministrator();
  if ("refusal" in who) return who.refusal;

  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const provisioned = await provisionUser({
    email: parsed.data.email,
    role: "pharmacy_admin",
    tenantId: who.auth.tenantId as string,
    fullName: parsed.data.full_name,
    phone: parsed.data.phone || null,
  });

  if (!provisioned.ok) {
    return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 500, { code: provisioned.code });
  }

  // A login with no staff row can sell and nothing else, so a failure here
  // leaves a safe login behind, and the page can save its access again.
  const saved = await who.supabase.rpc("pharmacy_save_staff", saveStaffArgs(provisioned.userId, parsed.data));

  // Shown once. It is not stored anywhere it can be read back from.
  return json(
    {
      data: { id: provisioned.userId, email: provisioned.email, password: provisioned.password },
      ...(saved.error ? { warning: { message: saved.error.message, code: saved.error.hint || undefined } } : {}),
    },
    201,
  );
};
