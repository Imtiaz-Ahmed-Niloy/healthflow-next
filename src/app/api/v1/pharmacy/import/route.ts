import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { pharmacyItemCreateSchema } from "@/server/resources/pharmacyItems";

/**
 * POST /api/v1/pharmacy/import — add many products at once, from a CSV the
 * page has already read into rows.
 *
 * Products only. Stock is not imported: a quantity needs a batch number and
 * an expiry date to mean anything, and that is "Add stock" or a purchase
 * order.
 *
 * A row whose SKU the hospital already has is skipped, not overwritten — an
 * import that silently repriced half the shelf would be worse than one that
 * did nothing. Rows that fail validation are reported by their line number
 * and the rest still go in.
 */

const MAX_ROWS = 1000;

const bodySchema = z.object({ rows: z.array(z.unknown()).min(1, "The file has no rows.").max(MAX_ROWS) });

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? `Send up to ${MAX_ROWS} rows at a time.`, 422);

  // Every SKU this hospital already has. Paged: PostgREST stops at 1,000 rows.
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const page = await who.supabase.from("pharmacy_items").select("sku").order("id").range(from, from + 999);
    if (page.error) return fromRpc(page.error);
    for (const row of page.data ?? []) existing.add(String(row.sku).trim().toLowerCase());
    if ((page.data ?? []).length < 1000) break;
  }

  const fresh: Record<string, unknown>[] = [];
  const invalid: { row: number; message: string }[] = [];
  let skipped = 0;

  parsed.data.rows.forEach((raw, index) => {
    const row = pharmacyItemCreateSchema.safeParse(raw);
    if (!row.success) {
      const issue = row.error.issues[0];
      invalid.push({ row: index + 1, message: `${issue?.path.join(".") || "row"}: ${issue?.message ?? "invalid"}` });
      return;
    }

    const key = row.data.sku.toLowerCase();
    if (existing.has(key)) {
      skipped += 1;
      return;
    }
    existing.add(key);

    // tenant_id from the session, as createResourceRoute stamps it.
    fresh.push({
      ...Object.fromEntries(Object.entries(row.data).filter(([, value]) => value !== undefined)),
      tenant_id: who.auth.tenantId,
    });
  });

  if (fresh.length) {
    // Rows from a CSV do not all fill the same columns. Without this, a column
    // one row leaves out is sent as null for it — and a null reorder level or
    // price is refused, taking the whole file with it.
    const { error } = await who.supabase.from("pharmacy_items").insert(fresh, { defaultToNull: false });
    if (error) return fromRpc(error);
  }

  return json({ data: { created: fresh.length, skipped, invalid } }, fresh.length ? 201 : 200);
};
