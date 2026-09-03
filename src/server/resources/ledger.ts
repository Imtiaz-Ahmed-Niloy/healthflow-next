import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The books — /api/v1/ledger-accounts and /api/v1/journal-entries, over
 * `public.ledger_accounts` and `public.journal_entries` (0063).
 *
 * Vouchers are READ through the factory and written through
 * /api/v1/accounts/vouchers, because a voucher is an entry plus its lines and
 * the two have to arrive together or not at all. See that route.
 */

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().max(2000).optional());

/** hospital_admin runs the hospital; finance_admin keeps the books. Nobody else. */
const BOOKS_ROLES = ["hospital_admin", "finance_admin"] as const;

// ------------------------------------------------------------- accounts ---

export const ledgerAccountCreateSchema = z.object({
  code: z.string().trim().min(1, "An account needs a code").max(40),
  name: z.string().trim().min(1, "An account needs a name").max(200),
  group: z.enum(["asset", "liability", "income", "expense", "capital"]),
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
  filterFields: ["group", "active"],
  defaultSort: { column: "code", ascending: true },
  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },
};

// ------------------------------------------------------------- vouchers ---

/**
 * Only the narration and the party are editable, and only while a voucher is
 * a draft — the database refuses line edits after posting (0063). A posted
 * voucher with the wrong amount is corrected by another voucher, which is what
 * a ledger is for.
 */
export const journalEntryUpdateSchema = z.object({
  party: optionalText,
  narration: optionalText,
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
    "*, journal_lines ( id, debit, credit, account_id, "
    + "ledger_accounts ( id, code, name, group ) )",

  searchFields: ["entry_no", "party", "narration"],
  filterFields: ["type", "status", "entry_date"],
  defaultSort: { column: "entry_date", ascending: false },

  roles: { read: [...BOOKS_ROLES], write: [...BOOKS_ROLES] },
};
