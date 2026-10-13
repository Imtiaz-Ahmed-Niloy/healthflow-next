import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { pharmacyPurchaseOrdersResource } from "@/server/resources/pharmacy";

/**
 * POST /api/v1/pharmacy/purchases — raise a purchase order.
 *
 * pharmacy_create_purchase_order (0127) numbers it, names each line as the
 * product is called today, and saves order and lines together. Receiving,
 * paying and cancelling are /api/v1/pharmacy/purchases/:id; reading is
 * /api/v1/pharmacy-purchase-orders.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

const orderSchema = z.object({
  supplier_id: z.string().uuid("Pick a supplier."),
  items: z
    .array(z.object({
      item_id: z.string().uuid(),
      quantity: z.coerce.number().int().positive().max(1_000_000),
      unit_cost: z.coerce.number().min(0).max(99_999_999).optional(),
    }))
    .min(1, "Add at least one product to the order.")
    .max(200),
  expected_date: day.nullable().optional().or(z.literal("").transform(() => null)),
  notes: z.string().trim().max(1000).nullable().optional(),
  tax: z.coerce.number().min(0).max(99_999_999).optional(),
  shipping_cost: z.coerce.number().min(0).max(99_999_999).optional(),
});

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = orderSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid order", 422);
  const order = parsed.data;

  const { data: orderId, error } = await who.supabase.rpc("pharmacy_create_purchase_order", {
    p_supplier_id: order.supplier_id,
    p_items: order.items,
    p_expected_date: order.expected_date ?? null,
    p_notes: order.notes ?? null,
    p_tax: order.tax ?? 0,
    p_shipping: order.shipping_cost ?? 0,
  });
  if (error) return fromRpc(error);

  const saved = await who.supabase
    .from("pharmacy_purchase_orders")
    .select(pharmacyPurchaseOrdersResource.select ?? "*")
    .eq("id", orderId)
    .single();
  if (saved.error) return fromRpc(saved.error);

  return json({ data: saved.data }, 201);
};
