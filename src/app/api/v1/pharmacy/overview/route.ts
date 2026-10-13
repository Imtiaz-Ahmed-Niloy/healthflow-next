import { fail, fromRpc, json, pharmacyAccess } from "@/server/pharmacy";

/**
 * GET /api/v1/pharmacy/overview — the three screens that are totals, not lists.
 *
 *   ?view=dashboard                today, this month, alerts, trend
 *   ?view=report&from=&to=         everything on the reports page for a span of days
 *   ?view=insights                 the forecast and the flags
 *
 * Each is one database function (0128), because a total added up here from
 * a list would be a total of the first thousand rows PostgREST returns.
 * Readable by finance as well as the pharmacy.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const GET = async (request: Request) => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "dashboard";

  // Reports and insights are shown to those given them (0133). This decides
  // what a login is shown; the sales underneath stay readable to the till.
  if (view === "report" || view === "insights") {
    // The forecast is also what a stock keeper orders from, so stock work opens insights too.
    const perms = view === "insights" ? ["see_reports", "manage_stock"] : ["see_reports"];
    const answers = await Promise.all(perms.map(perm => who.supabase.rpc("pharmacy_can", { p_perm: perm })));
    const failed = answers.find(answer => answer.error);
    if (failed?.error) return fromRpc(failed.error);
    if (!answers.some(answer => answer.data)) return fail("You do not have permission to do this.", 403, { code: "no_permission" });
  }

  if (view === "report") {
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    if (!DAY.test(from) || !DAY.test(to)) return fail("Pick a start and an end date.", 422);

    const { data, error } = await who.supabase.rpc("pharmacy_report", { p_from: from, p_to: to });
    if (error) return fromRpc(error);
    return json({ data });
  }

  if (view === "insights") {
    const { data, error } = await who.supabase.rpc("pharmacy_insights");
    if (error) return fromRpc(error);
    return json({ data });
  }

  if (view !== "dashboard") return fail("Unknown view", 400);

  const { data, error } = await who.supabase.rpc("pharmacy_dashboard");
  if (error) return fromRpc(error);
  return json({ data });
};
