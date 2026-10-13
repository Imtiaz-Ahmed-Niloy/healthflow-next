import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson, type PharmacyGrant } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/drawer — the signed-in person's own cash drawer.
 *
 *   GET    their open drawer with its lines and what should be in it, or null
 *   POST   { action: "open",  opening_balance }
 *          { action: "close", counted, note, shift_id? }
 *          { action: "cash_in" | "cash_out" | "expense", amount, note, category? }
 *          { action: "remove", id }
 *
 * A drawer belongs to whoever opened it (0126), so there is no drawer id in a
 * request: the function finds the caller's own. `shift_id` on close is the one
 * exception, and 0127 honours it for a hospital admin only. Past drawers are
 * read at /api/v1/pharmacy-cash-shifts.
 */

const money = z.coerce.number().min(0).max(99_999_999);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), opening_balance: money, register_id: z.string().uuid().nullable().optional() }),
  z.object({
    action: z.literal("close"),
    counted: money,
    note: z.string().trim().max(500).nullable().optional(),
    shift_id: z.string().uuid().nullable().optional(),
  }),
  z.object({
    action: z.enum(["cash_in", "cash_out", "expense"]),
    amount: z.coerce.number().positive("Enter an amount above zero.").max(99_999_999),
    note: z.string().trim().max(300).nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
  }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

type Line = { type: string; amount: number | string; created_at: string };

const sum = (lines: Line[], types: string[]) =>
  lines.filter(l => types.includes(l.type)).reduce((total, l) => total + Number(l.amount), 0);

/** The caller's open drawer, newest line first, with the totals the page shows. */
const readDrawer = async (who: PharmacyGrant) => {
  const { data, error } = await who.supabase
    .from("pharmacy_cash_shifts")
    .select("*, lines:pharmacy_cash_transactions(*), register:pharmacy_registers(id, name, code)")
    .eq("opened_by", who.auth.userId)
    .eq("status", "open")
    .maybeSingle();
  if (error || !data) return { error, drawer: null };

  const lines = [...((data.lines ?? []) as Line[])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const balance = Number(data.opening_balance) + lines.reduce((total, l) => total + Number(l.amount), 0);

  return {
    error: null,
    drawer: {
      ...data,
      lines,
      balance,
      totals: {
        sales: sum(lines, ["sale", "payment"]),
        cash_in: sum(lines, ["cash_in"]),
        cash_out: -sum(lines, ["cash_out"]),
        expenses: -sum(lines, ["expense"]),
        refunds: -sum(lines, ["refund"]),
      },
    },
  };
};

export const GET = async () => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const read = await readDrawer(who);
  if (read.error) return fromRpc(read.error);

  return json({ data: read.drawer });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = actionSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  let closedShiftId: string | null = null;

  if (body.action === "open") {
    const { error } = await who.supabase.rpc("pharmacy_open_shift", {
      p_opening_balance: body.opening_balance,
      p_register_id: body.register_id ?? null,
    });
    if (error) return fromRpc(error);
  } else if (body.action === "close") {
    const { data, error } = await who.supabase.rpc("pharmacy_close_shift", {
      p_counted: body.counted,
      p_note: body.note ?? null,
      p_shift_id: body.shift_id ?? null,
    });
    if (error) return fromRpc(error);
    closedShiftId = data as string;
  } else if (body.action === "remove") {
    const { error } = await who.supabase.rpc("pharmacy_remove_cash_transaction", { p_id: body.id });
    if (error) return fromRpc(error);
  } else {
    const { error } = await who.supabase.rpc("pharmacy_cash_move", {
      p_type: body.action,
      p_amount: body.amount,
      p_note: body.note ?? null,
      p_category: body.category ?? null,
    });
    if (error) return fromRpc(error);
  }

  // A closed drawer comes back whole, for the slip that is printed at closing.
  if (closedShiftId) {
    const closed = await who.supabase
      .from("pharmacy_cash_shifts")
      .select("*, lines:pharmacy_cash_transactions(*)")
      .eq("id", closedShiftId)
      .single();
    if (closed.error) return fromRpc(closed.error);
    return json({ data: null, closed: closed.data });
  }

  const read = await readDrawer(who);
  if (read.error) return fromRpc(read.error);

  return json({ data: read.drawer });
};
