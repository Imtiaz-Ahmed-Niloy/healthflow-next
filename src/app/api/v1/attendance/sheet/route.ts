import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/attendance/sheet?period=YYYY-MM
 *
 * A month of attendance for the whole hospital, plus that month's holidays.
 *
 * Outside createResourceRoute because the generic list filters are exact
 * matches — `filterFields` does `.eq` — and a month is a range. Paging the
 * generic endpoint would work but would mean several round trips to draw one
 * table, and the sheet needs the whole month at once to count anything.
 *
 * Runs on the caller's own client, so the tenant policy and the HR role gate
 * from 0050 both still apply. Nothing here is scoped by hand.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const ALLOWED = ["super_admin", "hospital_admin", "hr_admin"] as const;

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ALLOWED.includes(auth.role as (typeof ALLOWED)[number])) {
    return fail("Not allowed", 403);
  }

  const period = new URL(request.url).searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) return fail("Give a period as YYYY-MM", 400);

  const [year, month] = period.split("-").map(Number);
  const first = `${period}-01`;
  // Day 0 of the next month is the last day of this one, which avoids caring
  // how long the month is or whether it is a leap year.
  const lastDay = new Date(year, month, 0).getDate();
  const last = `${period}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createServerSupabase();

  const [records, holidays] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, employee_id, work_date, check_in, check_out, status, note")
      .gte("work_date", first)
      .lte("work_date", last),
    supabase
      .from("holidays")
      .select("id, holiday_on, name")
      .gte("holiday_on", first)
      .lte("holiday_on", last),
  ]);

  if (records.error) return fail(records.error.message, 400);
  if (holidays.error) return fail(holidays.error.message, 400);

  return json({ data: { records: records.data ?? [], holidays: holidays.data ?? [] } });
};
