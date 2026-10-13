import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { pharmacySalesResource } from "@/server/resources/pharmacy";

/**
 * POST /api/v1/pharmacy/sales/:id — what can happen to a sale after it is made.
 *
 *   { action: "return",  items, reason, refund_method, notes, manager_pin? }
 *   { action: "payment", amount, method, reference }
 *
 * A sale is never edited. Goods coming back are a return (pharmacy_return_sale)
 * and money arriving later against a sale on account is a payment
 * (pharmacy_collect_payment); both are 0127 and both answer with the sale as
 * it now stands. Reading sales is /api/v1/pharmacy-sales.
 */

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("return"),
    items: z
      .array(z.object({
        sale_item_id: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(100_000),
        // Only "restock" goes back on the shelf.
        condition: z.enum(["restock", "damaged", "expired"]).default("restock"),
      }))
      .min(1, "Pick what is being returned."),
    reason: z.string().trim().min(1, "Say why it is being returned.").max(300),
    refund_method: z.enum(["cash", "original", "credit"]).default("cash"),
    notes: z.string().trim().max(500).nullable().optional(),
    // A manager's PIN, when the person at the till may not approve a return themselves.
    manager_pin: z.string().trim().max(10).nullable().optional(),
  }),
  z.object({
    action: z.literal("payment"),
    amount: z.coerce.number().positive("Enter an amount above zero.").max(99_999_999),
    method: z.enum(["cash", "card", "mobile", "other"]),
    reference: z.string().trim().max(200).nullable().optional(),
  }),
]);

type Context = { params: Promise<{ id: string }> };

export const POST = async (request: Request, context: Context) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return fail("Not found", 404);

  const parsed = actionSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  if (body.action === "return") {
    const { data, error } = await who.supabase.rpc("pharmacy_return_sale", {
      p_sale_id: id,
      p_items: body.items,
      p_reason: body.reason,
      p_refund_method: body.refund_method,
      p_notes: body.notes ?? null,
      p_manager_pin: body.manager_pin || null,
    });
    if (error) return fromRpc(error);

    // A refused PIN is an answer, not an error (0134): the database has to
    // commit the count of wrong guesses, which a raise would roll back.
    const answer = data as { ok: boolean; code?: string };
    if (!answer?.ok) {
      const code = answer?.code ?? "bad_pin";
      return fail("A manager has to approve this return.", code === "pin_locked" ? 429 : 403, { code });
    }
  } else {
    const { error } = await who.supabase.rpc("pharmacy_collect_payment", {
      p_sale_id: id,
      p_amount: body.amount,
      p_method: body.method,
      p_reference: body.reference ?? null,
    });
    if (error) return fromRpc(error);
  }

  const saved = await who.supabase
    .from("pharmacy_sales")
    .select(pharmacySalesResource.select ?? "*")
    .eq("id", id)
    .single();
  if (saved.error) return fromRpc(saved.error);

  return json({ data: saved.data });
};
