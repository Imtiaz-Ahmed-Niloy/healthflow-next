import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";

/**
 * /api/v1/pharmacy/settings — one row per hospital (0126): what a receipt is
 * headed with, the VAT rate, the invoice prefix, the expense categories.
 *
 *   GET   the row, or the defaults for a hospital that has not saved one yet
 *   PUT   save it
 *
 * tenant_id is stamped from the session, never read from the body. Currency,
 * date format and timezone are not here — those are the platform's and each
 * person's own.
 */

const DEFAULTS = {
  pharmacy_name: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  address: null as string | null,
  license_no: null as string | null,
  tax_label: "VAT",
  tax_rate: 0,
  invoice_prefix: "INV",
  po_prefix: "PO",
  receipt_footer: null as string | null,
  return_policy: null as string | null,
  expiring_soon_days: 90,
  expense_categories: ["Rent", "Utilities", "Salaries", "Supplies", "Maintenance", "Transport", "Marketing", "Other"],
  tax_id: null as string | null,
  payment_terms: null as string | null,
  // Loyalty (0133). Off until the pharmacy switches it on.
  loyalty_enabled: false,
  loyalty_spend_per_point: 100,
  loyalty_point_value: 1,
  loyalty_min_redeem: 50,
  loyalty_silver_at: 500,
  loyalty_gold_at: 2000,
  loyalty_platinum_at: 5000,
  loyalty_silver_rate: 1.25,
  loyalty_gold_rate: 1.5,
  loyalty_platinum_rate: 2,
  // AI features (0136). Each can be switched off on its own.
  ai_assistant: true,
  ai_interactions: true,
  ai_predictions: true,
  ai_expiry: true,
  ai_interaction_level: "moderate",
};

const text = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((value) => (value === "" ? null : value));

const prefix = z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, "Use up to 10 letters or numbers.");

const settingsSchema = z.object({
  pharmacy_name: text(200),
  phone: text(40),
  email: text(200),
  address: text(500),
  license_no: text(100),
  tax_label: z.string().trim().min(1).max(20).optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  invoice_prefix: prefix.optional(),
  po_prefix: prefix.optional(),
  receipt_footer: text(500),
  return_policy: text(500),
  expiring_soon_days: z.coerce.number().int().min(1).max(730).optional(),
  expense_categories: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  tax_id: text(100),
  payment_terms: text(500),
  loyalty_enabled: z.boolean().optional(),
  loyalty_spend_per_point: z.coerce.number().positive("Must be above zero").max(1_000_000).optional(),
  loyalty_point_value: z.coerce.number().min(0).max(1_000_000).optional(),
  loyalty_min_redeem: z.coerce.number().int().min(1).max(1_000_000).optional(),
  loyalty_silver_at: z.coerce.number().int().min(1).max(100_000_000).optional(),
  loyalty_gold_at: z.coerce.number().int().min(1).max(100_000_000).optional(),
  loyalty_platinum_at: z.coerce.number().int().min(1).max(100_000_000).optional(),
  loyalty_silver_rate: z.coerce.number().min(1).max(10).optional(),
  loyalty_gold_rate: z.coerce.number().min(1).max(10).optional(),
  loyalty_platinum_rate: z.coerce.number().min(1).max(10).optional(),
  ai_assistant: z.boolean().optional(),
  ai_interactions: z.boolean().optional(),
  ai_predictions: z.boolean().optional(),
  ai_expiry: z.boolean().optional(),
  ai_interaction_level: z.enum(["minor", "moderate", "major", "severe"]).optional(),
});

export const GET = async () => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const [settings, hospital] = await Promise.all([
    who.supabase.from("pharmacy_settings").select("*").eq("tenant_id", who.auth.tenantId).maybeSingle(),
    who.supabase.from("tenants").select("name").eq("id", who.auth.tenantId).maybeSingle(),
  ]);
  if (settings.error) return fromRpc(settings.error);

  return json({
    data: { ...DEFAULTS, ...(settings.data ?? {}) },
    // What a receipt falls back to when no pharmacy name has been set.
    hospital: hospital.data?.name ?? null,
    // Whether the server has a key for the model. Only yes or no ever leaves the server.
    ai_configured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
};

export const PUT = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid settings", 422);

  // One of each category, however they were typed.
  const categories = parsed.data.expense_categories
    ? [...new Map(parsed.data.expense_categories.map(c => [c.toLowerCase(), c])).values()]
    : undefined;

  const { data, error } = await who.supabase
    .from("pharmacy_settings")
    .upsert(
      { ...parsed.data, ...(categories ? { expense_categories: categories } : {}), tenant_id: who.auth.tenantId },
      { onConflict: "tenant_id" },
    )
    .select("*")
    .single();
  // The tier lines have to rise: silver, then gold, then platinum (0133).
  if (error?.code === "23514") return fail("Each loyalty tier has to start higher than the one before it.", 422, { code: "tiers_out_of_order" });
  if (error) return fromRpc(error);

  return json({ data });
};
