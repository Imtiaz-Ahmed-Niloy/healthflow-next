import { NextResponse } from "next/server";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { computeRunPayslips, toSettings } from "@/lib/payroll";

/**
 * /api/v1/payroll-runs/:id/process (HF-67)
 *
 * Computes the run's payslips from the staff register and the hospital's
 * payroll settings, replaces whatever the run had before, and writes the
 * headcount and totals back onto the run.
 *
 * Outside createResourceRoute on purpose, same reasoning as
 * doctors/[id]/login: this is an action with side effects across three tables,
 * not CRUD on one. It is also the reason the computation moved out of the
 * browser — payslips are money, and a client that can POST arbitrary amounts
 * to /payroll-payslips is a client that can pay itself. Here the caller sends
 * no figures at all: the server derives every one of them.
 *
 * Nested under the same segment as the payroll-runs [[...id]] catch-all —
 * Next 15 scores segment specificity (static 0, dynamic 1, catch-all 2), so
 * `[id]/process` resolves ahead of `[[...id]]`.
 */

type RouteContext = {
  // Next 15: params arrive as a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const ALLOWED_ROLES = ["super_admin", "hospital_admin", "hr_admin", "finance_admin"] as const;

export const POST = async (_request: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.role || !ALLOWED_ROLES.includes(auth.role as (typeof ALLOWED_ROLES)[number])) {
    return fail("Not allowed", 403);
  }

  const { id } = await context.params;
  if (!id) return fail("Payroll run id is required", 400);

  // The caller's own client throughout, so RLS decides what this request can
  // see and write. A hospital_admin from another tenant gets the 404 below
  // rather than a 403 that would confirm the run exists.
  const supabase = await createServerSupabase();

  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, tenant_id, period, department, status")
    .eq("id", id)
    .maybeSingle();

  if (runError) return fail(runError.message, 400);
  if (!run) return fail("Payroll run not found", 404);

  // A paid run has been disbursed. Recomputing it would rewrite the record of
  // what was actually paid, which is the one thing a payslip is for.
  if (run.status === "paid") {
    return fail("This run has already been paid and can't be processed again.", 409);
  }

  const [{ data: settingsRow }, { data: employees, error: staffError }] = await Promise.all([
    supabase.from("payroll_settings").select("*").maybeSingle(),
    supabase.from("employees").select("*"),
  ]);

  if (staffError) return fail(staffError.message, 400);

  const settings = toSettings(settingsRow);
  const { payslips, headcount, gross, net } = computeRunPayslips(
    run.period,
    employees ?? [],
    settings,
    run.department,
  );

  // Replace rather than merge: processing is "recompute this run from
  // scratch", and an employee who left since the last attempt has to drop out
  // of the run, not linger because nothing overwrote their line.
  const { error: clearError } = await supabase
    .from("payroll_payslips")
    .delete()
    .eq("run_id", run.id);
  if (clearError) return fail(`Could not clear the previous payslips: ${clearError.message}`, 400);

  if (payslips.length) {
    const { error: insertError } = await supabase
      .from("payroll_payslips")
      .insert(payslips.map(slip => ({ ...slip, run_id: run.id, tenant_id: run.tenant_id })));
    if (insertError) {
      return fail(`Could not write the payslips: ${insertError.message}`, 400);
    }
  }

  // Totals last. If this fails the payslips are already correct and pressing
  // Process again is safe, which is the better half to leave broken.
  const { error: totalsError } = await supabase
    .from("payroll_runs")
    .update({ headcount, gross_total: gross, net_total: net })
    .eq("id", run.id);
  if (totalsError) {
    return fail(
      `The payslips were written, but the run totals could not be updated: ${totalsError.message}. Press Process again.`,
      500,
    );
  }

  return json({ data: { headcount, gross, net } });
};
