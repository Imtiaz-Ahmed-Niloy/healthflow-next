import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/loyalty — points, outside of a sale.
 *
 *   GET    how many customers, points outstanding, store credit held, and a
 *          count per tier (pharmacy_loyalty_summary)
 *   POST   { customer_id, points, reason } — a bonus or a correction by hand
 *          (pharmacy_adjust_points), for those who administer the pharmacy
 *
 * Points earned and spent at the till are part of the sale itself, in
 * pharmacy_create_sale. A customer's own history is /api/v1/pharmacy-customer-ledger.
 */

const adjustSchema = z.object({
  customer_id: z.string().uuid(),
  points: z.coerce.number().int().min(-10_000_000).max(10_000_000).refine(value => value !== 0, "Enter how many points."),
  reason: z.string().trim().min(1, "Say why the points are being changed.").max(300),
});

export const GET = async () => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const { data, error } = await who.supabase.rpc("pharmacy_loyalty_summary");
  if (error) return fromRpc(error);

  return json({ data });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = adjustSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { data, error } = await who.supabase.rpc("pharmacy_adjust_points", {
    p_customer_id: parsed.data.customer_id,
    p_points: parsed.data.points,
    p_reason: parsed.data.reason,
  });
  if (error) return fromRpc(error);

  return json({ data: { customer_id: parsed.data.customer_id, points: data } });
};
