import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/profile — the signed-in person's own details.
 *
 *   GET     name, email, phone, and what they are in the pharmacy
 *   PATCH   { full_name, phone } — their own row only
 *
 * The write goes through the caller's own client: profiles' policy lets a
 * person update their own row and nobody else's, and a trigger refuses a
 * change to role or hospital (0002), so there is nothing here to get wrong.
 * The email is the login and is not changed from this screen. A password is
 * changed in the browser, with Supabase Auth, and never passes through here.
 */

const patchSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().max(40).nullable().optional().transform(value => (value === "" ? null : value)),
});

const read = async (who: Exclude<Awaited<ReturnType<typeof pharmacyAccess>>, { refusal: unknown }>) => {
  const [profile, me] = await Promise.all([
    who.supabase.from("profiles").select("id, full_name, email, phone, role, created_at").eq("id", who.auth.userId).maybeSingle(),
    who.supabase.rpc("pharmacy_me"),
  ]);
  return { profile, me };
};

export const GET = async () => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const { profile, me } = await read(who);
  if (profile.error) return fromRpc(profile.error);
  if (!profile.data) return fail("Not found", 404);

  return json({ data: { ...profile.data, pharmacy: me.data ?? null } });
};

export const PATCH = async (request: Request) => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { error } = await who.supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone ?? null })
    .eq("id", who.auth.userId);
  if (error) return fromRpc(error);

  const { profile, me } = await read(who);
  if (profile.error) return fromRpc(profile.error);

  return json({ data: { ...profile.data, pharmacy: me.data ?? null } });
};
