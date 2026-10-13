import { fail, fromRpc, json, pharmacyAccess } from "@/server/pharmacy";

/**
 * GET /api/v1/pharmacy/audit — who changed what in this hospital's pharmacy.
 *
 *   ?from=&to=&table=&action=&q=&page=&limit=
 *
 * The same log as /super/logs, cut down by pharmacy_audit_log (0134) to the
 * caller's own hospital and to the pharmacy's tables. That function refuses
 * anyone who does not administer the pharmacy, so nothing is checked here
 * beyond the shape of the query.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const GET = async (request: Request) => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) return fail("Pick a start and an end date.", 422);

  const table = url.searchParams.get("table") ?? "";
  if (table && !/^pharmacy_[a-z_]+$/.test(table)) return fail("Unknown table", 422);

  const action = url.searchParams.get("action") ?? "";
  if (action && !["insert", "update", "delete"].includes(action)) return fail("Unknown action", 422);

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 25, 1), 200);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);

  const { data, error } = await who.supabase.rpc("pharmacy_audit_log", {
    p_from: from || null,
    p_to: to || null,
    p_table: table || null,
    p_action: action || null,
    p_q: (url.searchParams.get("q") ?? "").slice(0, 100) || null,
    p_limit: limit,
    p_offset: (page - 1) * limit,
  });
  if (error) return fromRpc(error);

  const total = Number((data as { total: number }).total);
  return json({
    data: (data as { rows: unknown[] }).rows,
    meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
};
