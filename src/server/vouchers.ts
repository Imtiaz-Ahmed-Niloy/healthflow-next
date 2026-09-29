import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AuthContext } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * What creating and editing a voucher share: the shape of one, how its own
 * party, narration and cost center are filled from its lines, and the
 * password check that editing and deleting stand behind.
 *
 * Routes: POST /api/v1/accounts/vouchers creates; PATCH and DELETE on
 * /api/v1/accounts/vouchers/:id edit and delete.
 */

const money = z.coerce.number().min(0).max(9_999_999_999);

const lineSchema = z
  .object({
    account_id: z.string().uuid("Pick an account"),
    debit: money.optional().default(0),
    credit: money.optional().default(0),
    // Each entry's own details (0106). The form sends an entry as a debit
    // line and a credit line, both carrying the same three.
    party: z.string().trim().max(200).optional().or(z.literal("")),
    narration: z.string().trim().max(2000).optional().or(z.literal("")),
    cost_center_id: z.string().uuid("Pick a cost center").optional().or(z.literal("")),
  })
  .refine(l => (l.debit > 0) !== (l.credit > 0), {
    message: "Each line is either a debit or a credit, not both and not neither",
  });

export const voucherSchema = z
  .object({
    entry_no: z.string().trim().min(1, "The voucher needs a number").max(40),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    type: z.enum([
      "payment", "receipt", "contra", "journal",
      "sales", "purchase", "credit_note", "debit_note",
      "petty_cash", "stock_journal",
    ]),
    party: z.string().trim().max(200).optional().or(z.literal("")),
    narration: z.string().trim().max(2000).optional().or(z.literal("")),
    lines: z.array(lineSchema).min(2, "A voucher needs at least one debit and one credit"),
    /** The department it is booked to (0074). Optional — most vouchers have none. */
    cost_center_id: z.string().uuid("Pick a cost center").optional().or(z.literal("")),
    /** A draft can be finished later; the balance check waits until posting. */
    post: z.boolean().optional().default(true),
    /** Not posted, but sent for approval: saved, then marked pending (0114). */
    submit: z.boolean().optional().default(false),
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

export type VoucherInput = z.infer<typeof voucherSchema>;

/**
 * The voucher's own party, narration and cost center, which the voucher
 * list, its search and its export read. When the request leaves them out,
 * they come from the lines: every distinct party and narration in order, and
 * the cost center only if every line carries the same one. Not merely the
 * lines that name one: ledger_movements falls back to the voucher's center
 * for an untagged line, so a partial match would book untagged lines to it.
 */
export const voucherHeader = (v: VoucherInput) => {
  const distinct = (values: (string | undefined)[]) =>
    [...new Set(values.map(x => x?.trim()).filter((x): x is string => Boolean(x)))];
  const party = v.party || distinct(v.lines.map(l => l.party)).join(", ").slice(0, 200);
  const narration = v.narration || distinct(v.lines.map(l => l.narration)).join("; ").slice(0, 2000);
  const sharedCenter = v.lines.every(l => l.cost_center_id && l.cost_center_id === v.lines[0].cost_center_id)
    ? v.lines[0].cost_center_id
    : "";
  return { party: party || null, narration: narration || null, cost_center_id: v.cost_center_id || sharedCenter || null };
};

/**
 * Runs `work` as the caller, on a session made fresh by signing in again with
 * the password they just typed. `update_voucher` and `delete_voucher` (0109,
 * 0111) refuse anything without a password sign-in in the last two minutes,
 * so this is what lets them through — the rule itself lives in the database.
 *
 * The throwaway client keeps the browser's own session untouched, and is
 * signed out afterwards. Returns null when the password is wrong.
 */
export const withConfirmedPassword = async <T>(
  auth: AuthContext,
  password: string,
  work: (client: ReturnType<typeof createClient<Database>>) => PromiseLike<T>,
): Promise<T | null> => {
  if (!auth.email) return null;

  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await client.auth.signInWithPassword({ email: auth.email, password });
  if (error || data.user?.id !== auth.userId) return null;

  try {
    return await work(client);
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
};
