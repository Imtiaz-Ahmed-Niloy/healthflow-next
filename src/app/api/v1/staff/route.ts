import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/staff?date=YYYY-MM-DD — what a doctor's team member sees (0147):
 * whose team they are on, and that doctor's appointments on the day.
 *
 * Both come from security-definer functions that check the member row
 * themselves — their login has no hospital, so nothing else would answer.
 * The date is the browser's own, so "today" is the member's local day.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor_staff") return fail("Only a member of a doctor's team can open this", 403);

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Which day?", 422);

  const supabase = await createServerSupabase();
  const { data: context, error: contextError } = await supabase.rpc("doctor_staff_context");
  if (contextError) return fail(contextError.message, 500);
  const me = context?.[0] ?? null;
  if (!me) return fail("You are not on a doctor's team any more.", 404);

  // A paused member still sees whose team they are on, just not the list.
  if (me.status !== "active") return json({ data: { me, queue: [] } });

  const { data: queue, error } = await supabase.rpc("doctor_staff_queue", { p_date: date });
  if (error) return fail(error.message, error.code === "42501" ? 403 : 500);

  return json({ data: { me, queue: queue ?? [] } });
};
