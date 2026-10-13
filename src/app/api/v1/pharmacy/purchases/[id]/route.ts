import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { pharmacyPurchaseOrdersResource } from "@/server/resources/pharmacy";

/**
 * POST /api/v1/pharmacy/purchases/:id — what happens to an order once raised.
 *
 *   { action: "receive", lines: [{ po_item_id, quantity, batch_number, expiry_date, location }] }
 *   { action: "pay",     amount }
 *   { action: "cancel" }
 *
 * Receiving is where stock comes into being: each line becomes a batch, or
 * adds to the batch already carrying that number (0127). Answers with the
 * order as it now stands.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("receive"),
    lines: z
      .array(z.object({
        po_item_id: z.string().uuid(),
        quantity: z.coerce.number().int().min(0).max(1_000_000),
        batch_number: z.string().trim().max(100).optional(),
        expiry_date: day.nullable().optional().or(z.literal("").transform(() => null)),
        location: z.string().trim().max(100).optional(),
      }))
      .min(1, "Enter what arrived."),
  }),
  z.object({
    action: z.literal("pay"),
    amount: z.coerce.number().positive("Enter an amount above zero.").max(99_999_999),
  }),
  z.object({ action: z.literal("cancel") }),
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

  const { error } =
    body.action === "receive"
      ? await who.supabase.rpc("pharmacy_receive_purchase_order", { p_order_id: id, p_lines: body.lines })
      : body.action === "pay"
        ? await who.supabase.rpc("pharmacy_pay_purchase_order", { p_order_id: id, p_amount: body.amount })
        : await who.supabase.rpc("pharmacy_cancel_purchase_order", { p_order_id: id });
  if (error) return fromRpc(error);

  const saved = await who.supabase
    .from("pharmacy_purchase_orders")
    .select(pharmacyPurchaseOrdersResource.select ?? "*")
    .eq("id", id)
    .single();
  if (saved.error) return fromRpc(saved.error);

  return json({ data: saved.data });
};
