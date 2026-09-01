import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";

/**
 * POST /api/v1/super/billing/generate  { "month": "2026-08" }
 *
 * Raises the month's platform invoices — one per approved hospital on an
 * active package, for the prescriptions its doctors wrote.
 *
 * Outside createResourceRoute because this is not a row anybody writes. The
 * whole run is `public.generate_platform_invoices` (0056): counting across
 * every tenant's appointments, checking eligibility and inserting are one
 * statement, so two people pressing the button at the same moment cannot
 * produce two bills for the same month — the unique index decides, and the
 * loser is told the invoice already exists.
 *
 * The super_admin check here is defence in depth. The function checks it too,
 * and it is the one that matters: it is SECURITY DEFINER, so it reads past
 * RLS by design.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, details?: unknown) =>
  json({ error: { message, ...(details ? { details } : {}) } }, status);

/** The screen sends a month, not a date. The first of it is what gets billed. */
const bodySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM"),
});

/** Mirrors the outcomes the function returns, in the order a reader wants them. */
export type GenerateOutcome =
  | "created"
  | "exists"
  | "no_prescriptions"
  | "not_approved"
  | "no_active_package";

type Row = {
  tenant_id: string;
  hospital: string;
  outcome: GenerateOutcome;
  invoice_id: string | null;
  prescriptions: number | null;
  total: number | string | null;
};

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be valid JSON", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("generate_platform_invoices", {
    p_month: `${parsed.data.month}-01`,
  });

  if (error) {
    // 22023 is the function's own "that month has not started yet". Anything
    // else is unexpected and says what it was.
    if (error.code === "22023") return fail(error.message.replace(/^.*?: /, ""), 422);
    if (error.code === "42501") return fail("Not allowed", 403);
    return fail(error.message, 400);
  }

  const rows = (data ?? []) as Row[];

  // A count per outcome, so the screen can say "3 raised, 2 skipped" without
  // re-deriving it, and the rows themselves for the report underneath.
  const summary = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] ?? 0) + 1;
    return acc;
  }, {});

  const billed = rows
    .filter((row) => row.outcome === "created")
    .reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return json({ data: { month: parsed.data.month, summary, billed, rows } });
};
