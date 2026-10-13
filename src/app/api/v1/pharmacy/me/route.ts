import { fromRpc, json, pharmacyAccess } from "@/server/pharmacy";

/**
 * GET /api/v1/pharmacy/me — what the signed-in person is in the pharmacy and
 * what they may do there (0131): their staff role, their branch, whether they
 * have a PIN, and one yes or no per permission.
 *
 * The panel asks this once to decide which screens and buttons to show. It is
 * a courtesy, not the lock: every one of these is checked again in the
 * database when the thing is actually attempted.
 */
export const GET = async () => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const { data, error } = await who.supabase.rpc("pharmacy_me");
  if (error) return fromRpc(error);

  return json({ data });
};
