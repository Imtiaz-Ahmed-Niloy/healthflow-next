import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/server";

/**
 * POST /api/v1/accounts/vouchers — records one voucher and its lines.
 *
 * Outside createResourceRoute because a voucher is two tables: the entry and
 * the debits and credits under it. Half a voucher is not a smaller voucher,
 * it is a corrupt ledger, so both go in one transaction — `record_voucher` in
 * 0063 — which also runs the balance check before posting.
 *
 * The database is the authority on the accounting rules. Everything below is
 * about giving a person a sentence they can act on instead of a Postgres
 * error code.
 */

const BOOKS_ROLES: AppRole[] = ["hospital_admin", "finance_admin"];

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const money = z.coerce.number().min(0).max(9_999_999_999);

const lineSchema = z
  .object({
    account_id: z.string().uuid("Pick an account"),
    debit: money.optional().default(0),
    credit: money.optional().default(0),
  })
  .refine(l => (l.debit > 0) !== (l.credit > 0), {
    message: "Each line is either a debit or a credit, not both and not neither",
  });

const voucherSchema = z
  .object({
    entry_no: z.string().trim().min(1, "The voucher needs a number").max(40),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    type: z.enum([
      "payment", "receipt", "contra", "journal",
      "sales", "purchase", "credit_note", "debit_note",
    ]),
    party: z.string().trim().max(200).optional().or(z.literal("")),
    narration: z.string().trim().max(2000).optional().or(z.literal("")),
    lines: z.array(lineSchema).min(2, "A voucher needs at least one debit and one credit"),
    /** A draft can be finished later; the balance check waits until posting. */
    post: z.boolean().optional().default(true),
  })
  .refine(
    v => {
      const debit = v.lines.reduce((s, l) => s + l.debit, 0);
      const credit = v.lines.reduce((s, l) => s + l.credit, 0);
      // Compared in paisa, because 0.1 + 0.2 is not 0.3 in binary floating
      // point and a voucher must not be refused over the last paisa.
      return !v.post || Math.round(debit * 100) === Math.round(credit * 100);
    },
    { message: "This voucher does not balance — debits and credits must be equal", path: ["lines"] },
  );

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!auth.tenantId || !auth.role || !BOOKS_ROLES.includes(auth.role)) {
    return fail("Not allowed to write to the books", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = voucherSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: { message: parsed.error.issues[0]?.message ?? "Invalid voucher", details: parsed.error.flatten() } },
      422,
    );
  }

  const { entry_no, entry_date, type, party, narration, lines, post } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("record_voucher", {
    p_entry_no: entry_no,
    p_entry_date: entry_date,
    p_type: type,
    p_party: party || null,
    p_narration: narration || null,
    p_lines: lines,
    p_post: post,
  });

  if (error) {
    // 23505 = the unique index on (tenant, entry_no).
    if (error.code === "23505") return fail(`Voucher ${entry_no} already exists`, 409);
    return fail(error.message, 400);
  }

  return json({ data }, 201);
};
