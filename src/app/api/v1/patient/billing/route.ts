import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * /api/v1/patient/billing (HF-77)
 *
 * A patient's own invoices, and the figures the page shows above them.
 *
 * Runs on the CALLER'S client, not the service role. That is possible because
 * 0044 added `finance_invoices_patient_select`, a policy that answers "is this
 * invoice mine" without reference to a tenant — a patient has no tenant_id,
 * and one login can hold a patients row in several hospitals, so the standard
 * tenant policy could never have expressed it. The neighbouring appointments
 * route predates that policy and still reaches for the admin client; this one
 * does not need to.
 *
 * Everything above the table is derived here rather than stored: a balance
 * that is a column is a balance that can disagree with the invoices under it.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const amountOf = (value: unknown) => Number(value) || 0;

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "patient") return fail("Only a patient can read their own bills", 403);

  const supabase = await createServerSupabase();

  // No .eq("patient_id", …) filter: RLS already restricts this to the caller's
  // own invoices, and filtering by an id the client supplied would be the
  // beginning of trusting one.
  const { data, error } = await supabase
    .from("finance_invoices")
    .select("id, reference, amount, due_date, paid_at, created_at")
    .not("patient_id", "is", null)
    .order("due_date", { ascending: false });

  if (error) return fail(error.message, 400);

  const invoices = data ?? [];
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const outstanding = invoices.filter(i => !i.paid_at);
  const settled = invoices.filter(i => i.paid_at);

  // Most recently settled invoice, by when it was settled.
  const lastPayment = settled
    .slice()
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0] ?? null;

  // Soonest unpaid bill that has not already fallen due.
  const upcoming = outstanding
    .filter(i => new Date(`${i.due_date}T00:00:00`) >= startOfToday)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null;

  return json({
    data: {
      invoices: invoices.map(i => ({
        id: i.id,
        reference: i.reference,
        amount: amountOf(i.amount),
        due_date: i.due_date,
        paid_at: i.paid_at,
        // An invoice due today is not late until tomorrow.
        overdue: !i.paid_at && new Date(`${i.due_date}T00:00:00`) < startOfToday,
      })),
      summary: {
        outstanding: outstanding.reduce((sum, i) => sum + amountOf(i.amount), 0),
        last_payment: lastPayment
          ? { amount: amountOf(lastPayment.amount), paid_at: lastPayment.paid_at }
          : null,
        upcoming_due: upcoming
          ? { amount: amountOf(upcoming.amount), due_date: upcoming.due_date }
          : null,
      },
    },
  });
};
