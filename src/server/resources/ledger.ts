import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ResourceDefinition } from "./types";

/**
 * The books — /api/v1/ledger-accounts and /api/v1/journal-entries, over
 * `public.ledger_accounts` and `public.journal_entries` (0063, 0074).
 *
 * Vouchers are READ through the factory and written through
 * /api/v1/accounts/vouchers, because a voucher is an entry plus its lines and
 * the two have to arrive together or not at all. See that route.
 */

/**
 * The Tally groups an account can sit under (0074). The class — asset,
 * liability and so on — is derived from this by a trigger, so the form sends
 * one field and the two cannot disagree.
 */
export const LEDGER_SUBGROUPS = [
  "cash_in_hand", "bank_accounts", "current_assets", "sundry_debtors", "fixed_assets",
  "sundry_creditors", "duties_taxes", "current_liabilities", "loans",
  "capital",
  "direct_income", "indirect_income",
  "direct_expenses", "indirect_expenses",
] as const;

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());

/** hospital_admin runs the hospital; finance_admin keeps the books. Nobody else. */
const BOOKS_ROLES = ["hospital_admin", "finance_admin"] as const;

// ------------------------------------------------------------- accounts ---

export const ledgerAccountCreateSchema = z.object({
  code: z.string().trim().min(1, "An account needs a code").max(40),
  name: z.string().trim().min(1, "An account needs a name").max(200),
  subgroup: z.enum(LEDGER_SUBGROUPS, { errorMap: () => ({ message: "Pick a group" }) }),
  /**
   * Signed, in the account's own natural direction — see the column comment
   * in 0063. Negative is legitimate: an overdrawn bank account.
   */
  opening_balance: z.preprocess(blankToUndefined, z.coerce.number().optional()),
  active: z.preprocess(
    value => (value === "" || value === undefined ? undefined : value === true || value === "true"),
    z.boolean().optional(),
  ),
});

export const ledgerAccountUpdateSchema = ledgerAccountCreateSchema.partial();

export const ledgerAccountsResource: ResourceDefinition<
  z.infer<typeof ledgerAccountCreateSchema>,
  z.infer<typeof ledgerAccountUpdateSchema>
> = {
  name: "ledger-accounts",
  table: "ledger_accounts",
  tenantScoped: true,
  createSchema: ledgerAccountCreateSchema,
  updateSchema: ledgerAccountUpdateSchema,
  searchFields: ["code", "name"],
  filterFields: ["group", "subgroup", "active"],
  defaultSort: { column: "code", ascending: true },
  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },

  // The lines hold the account with ON DELETE RESTRICT, which the factory
  // would report as "Related record not found" — true of nothing here.
  // Say what is actually in the way, and what to do instead.
  beforeDelete: async ({ id }) => {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("journal_lines")
      .select("id", { count: "exact", head: true })
      .eq("account_id", id);

    if (count) return "This ledger has entries posted to it — deactivate it instead of deleting it";
  },
};

// ------------------------------------------------------------- vouchers ---

/**
 * The words around a voucher, never its amounts — the database refuses line
 * edits after posting (0063). A posted voucher with the wrong amount is
 * corrected by another voucher, which is what a ledger is for.
 *
 * The cost center is the department it was booked to and can be re-allocated;
 * `reconciled_on` is set when it is ticked off a bank statement, and null
 * un-ticks it.
 */
export const journalEntryUpdateSchema = z.object({
  party: optionalText,
  narration: optionalText,
  cost_center_id: z.preprocess(
    value => (value === "" ? null : value),
    z.string().uuid("Pick a cost center").nullable().optional(),
  ),
  reconciled_on: z.preprocess(
    value => (value === "" ? null : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
  ),
});

export const journalEntriesResource: ResourceDefinition<
  never,
  z.infer<typeof journalEntryUpdateSchema>
> = {
  name: "journal-entries",
  table: "journal_entries",
  tenantScoped: true,

  // Creating one goes through /api/v1/accounts/vouchers: an entry without its
  // lines is half a voucher, and this factory writes one table.
  createSchema: z.never() as never,
  updateSchema: journalEntryUpdateSchema,

  select:
    "*, cost_centers ( id, name ), journal_lines ( id, debit, credit, account_id, "
    + "ledger_accounts ( id, code, name, group, subgroup ) )",

  searchFields: ["entry_no", "party", "narration"],
  filterFields: ["type", "status", "entry_date", "cost_center_id"],
  defaultSort: { column: "entry_date", ascending: false },

  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },

  // The trigger in 0063 refuses to delete a posted voucher's lines, and the
  // cascade would surface that as a Postgres error. A draft can go; a posted
  // voucher is reversed with another one.
  beforeDelete: async ({ id }) => {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("journal_entries")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (data?.status === "posted") {
      return "A posted voucher cannot be deleted — record a reversing voucher instead";
    }
  },
};
