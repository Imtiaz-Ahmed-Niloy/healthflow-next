import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { pharmacySalesResource } from "@/server/resources/pharmacy";

/**
 * /api/v1/pharmacy/pos — the till.
 *
 *   GET   ?q=&category=&limit=   what can be sold right now, best sellers first
 *   POST                         make a sale
 *
 * The sale itself is pharmacy_create_sale (0127, rewritten in 0134): it takes the stock from the
 * batch that expires soonest, prices every line from the catalogue, writes the
 * invoice and the drawer line, and does all of it or none of it. The request
 * says what and how many; it never says how much.
 */

const saleSchema = z.object({
  items: z
    .array(z.object({
      item_id: z.string().uuid(),
      quantity: z.coerce.number().int().positive().max(100_000),
      // How it is counted: single units, strips or boxes (0133).
      unit: z.enum(["unit", "strip", "box"]).default("unit"),
    }))
    .min(1, "Add at least one product to the order.")
    .max(200),
  payment_method: z.enum(["cash", "card", "mobile", "credit", "other", "split", "store_credit"]),
  // The parts of a split payment. Ignored for every other method.
  payments: z
    .array(z.object({
      method: z.enum(["cash", "card", "mobile", "other", "store_credit"]),
      amount: z.coerce.number().positive().max(99_999_999),
      reference: z.string().trim().max(200).nullable().optional(),
    }))
    .max(5)
    .nullable()
    .optional(),
  redeem_points: z.coerce.number().int().min(0).max(10_000_000).optional(),
  tendered: z.coerce.number().min(0).max(99_999_999).optional(),
  discount: z.coerce.number().min(0).max(99_999_999).optional(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_name: z.string().trim().max(200).nullable().optional(),
  customer_phone: z.string().trim().max(40).nullable().optional(),
  payment_reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const GET = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const url = new URL(request.url);
  const [items, categories] = await Promise.all([
    who.supabase.rpc("pharmacy_pos_items", {
      p_q: url.searchParams.get("q") ?? "",
      p_category: url.searchParams.get("category") ?? "",
      p_limit: Number(url.searchParams.get("limit")) || 24,
    }),
    who.supabase.rpc("pharmacy_categories"),
  ]);
  if (items.error) return fromRpc(items.error);

  return json({ data: items.data ?? [], categories: categories.data ?? [] });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = saleSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid sale", 422);
  const sale = parsed.data;

  const { data: saleId, error } = await who.supabase.rpc("pharmacy_create_sale", {
    p_items: sale.items,
    p_payment_method: sale.payment_method,
    p_tendered: sale.tendered ?? 0,
    p_discount: sale.discount ?? 0,
    p_customer_id: sale.customer_id ?? null,
    p_customer_name: sale.customer_name ?? null,
    p_customer_phone: sale.customer_phone ?? null,
    p_payment_reference: sale.payment_reference ?? null,
    p_notes: sale.notes ?? null,
    p_redeem_points: sale.redeem_points ?? 0,
    p_payments: sale.payment_method === "split" ? (sale.payments ?? null) : null,
  });
  if (error) return fromRpc(error);

  // The receipt prints from what was saved, not from what was asked for.
  const saved = await who.supabase
    .from("pharmacy_sales")
    .select(pharmacySalesResource.select ?? "*")
    .eq("id", saleId)
    .single();
  if (saved.error) return fromRpc(saved.error);

  return json({ data: saved.data }, 201);
};
