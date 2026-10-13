import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/stock — stock that does not come from a purchase order.
 *
 *   GET    the alerts: products out of or low on stock, batches expiring or expired
 *   POST   { action: "add",    item_id, batch_number, quantity, expiry_date, location, unit_cost, supplier_id, note }
 *          { action: "adjust", batch_id, quantity, reason, note }
 *
 * "adjust" sets what is really on the shelf and says why — a recount, or a
 * write-off as damaged, expired or lost. Both are 0127, and both put a line
 * on the stock ledger. Batches are read at /api/v1/pharmacy-batches.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    item_id: z.string().uuid("Pick a product."),
    batch_number: z.string().trim().min(1, "Enter the batch number.").max(100),
    quantity: z.coerce.number().int().positive("Enter a quantity above zero.").max(1_000_000),
    expiry_date: day.nullable().optional().or(z.literal("").transform(() => null)),
    location: z.string().trim().max(100).nullable().optional(),
    unit_cost: z.coerce.number().min(0).max(99_999_999).nullable().optional(),
    supplier_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
    note: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    action: z.literal("adjust"),
    batch_id: z.string().uuid(),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    reason: z.enum(["adjustment", "damaged", "expired", "lost"]),
    note: z.string().trim().max(300).nullable().optional(),
  }),
]);

export const GET = async () => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const { data, error } = await who.supabase.rpc("pharmacy_stock_alerts");
  if (error) return fromRpc(error);

  return json({ data });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = actionSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  const { data, error } =
    body.action === "add"
      ? await who.supabase.rpc("pharmacy_add_stock", {
          p_item_id: body.item_id,
          p_batch_number: body.batch_number,
          p_quantity: body.quantity,
          p_expiry_date: body.expiry_date ?? null,
          p_location: body.location ?? null,
          p_unit_cost: body.unit_cost ?? null,
          p_supplier_id: body.supplier_id ?? null,
          p_note: body.note ?? null,
        })
      : await who.supabase.rpc("pharmacy_adjust_stock", {
          p_batch_id: body.batch_id,
          p_quantity: body.quantity,
          p_reason: body.reason,
          p_note: body.note ?? null,
        });
  if (error) return fromRpc(error);

  return json({ data: { result: data } }, body.action === "add" ? 201 : 200);
};
