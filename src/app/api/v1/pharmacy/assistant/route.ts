import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
// The SDK's structured-output helper reads Zod 4 schemas; the rest of the app is on Zod 3's API.
import { z as z4 } from "zod/v4";
import { fail, fromRpc, json, pharmacyAccess, readJson, type PharmacyGrant } from "@/server/pharmacy";

/**
 * POST /api/v1/pharmacy/assistant — the two AI features that call a model.
 *
 *   { mode: "chat", messages }           answers a question about this pharmacy's own figures
 *   { mode: "interactions", items }      checks the medicines in a cart against each other
 *
 * The model is Claude, called from here with the server's own key
 * (ANTHROPIC_API_KEY). Without a key this answers 503 "ai_not_configured" and
 * nothing leaves the building. A hospital can also switch either feature off
 * in its pharmacy settings (0136).
 *
 * What is sent: for chat, the same totals the dashboard, reports and insights
 * screens show — read through the caller's own client, so RLS has already
 * limited it to their hospital — and the conversation. No customer names or
 * phone numbers are in those totals. For interactions, the product and
 * generic names in the cart and nothing else.
 *
 * Neither answer changes anything: the assistant cannot sell, refund or edit.
 */

export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const LEVELS = ["minor", "moderate", "major", "severe"] as const;

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("chat"),
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
      .min(1)
      .max(30),
  }),
  z.object({
    mode: z.literal("interactions"),
    items: z
      .array(z.object({ name: z.string().trim().min(1).max(200), generic_name: z.string().trim().max(200).nullable().optional() }))
      .min(2, "Add at least two medicines to check.")
      .max(40),
  }),
]);

const interactionSchema = z4.object({
  interactions: z4.array(z4.object({
    drugs: z4.array(z4.string()),
    severity: z4.enum(LEVELS),
    effect: z4.string(),
    advice: z4.string(),
  })),
  summary: z4.string(),
});

const CHAT_SYSTEM = `You are the assistant inside a hospital pharmacy's management panel in Bangladesh. The person asking works there: an owner, a manager or a pharmacist.

You answer questions about this pharmacy using the figures in the <pharmacy_data> block below, which were read from its own records a moment ago. Money is in the pharmacy's own currency (usually Bangladeshi taka); do not add a currency symbol the data does not use.

How to answer:
- Lead with the answer, then the one or two figures that support it. Keep it short; these are read at a counter.
- Use only what is in the data. If the data does not hold what is asked (a single invoice, a named customer, a day outside the periods given), say plainly that it is not in what you can see and name the screen that has it: Sales History, Customers, Stock, Reports, Purchase Orders, Insights.
- Never invent a number. An estimate has to be called an estimate, with the figures it came from.
- You can read. You cannot sell, refund, order, or change anything, and should say so if asked to.
- For a question about a medicine itself (dose, safety, interactions), give general information and say that the pharmacist's own judgement and the prescription decide.
- Reply in the language the question was asked in. Write plainly, without headings for a short answer.`;

const INTERACTION_SYSTEM = `You check a list of medicines being sold together at a pharmacy counter for drug-drug interactions, for the pharmacist who is about to hand them over.

Report each pair (or group) with a clinically recognised interaction. For each: the medicines involved by the names given, a severity (minor, moderate, major or severe), what the interaction does in one sentence, and what the pharmacist should do in one sentence. Go by the generic (active ingredient) name when one is given; a brand name alone may be a local Bangladeshi brand, so only use it when you are confident what it contains, and otherwise leave it out and say so in the summary.

Do not pad the list: two medicines with no recognised interaction are not an entry, and the same active ingredient under two brands is a duplication worth reporting as its own entry. If nothing interacts, return an empty list and say so in the summary. The summary is one or two plain sentences. This is decision support; it does not replace the pharmacist's judgement.`;

/** The totals the panel's own screens show, as one compact block for the model. */
const snapshot = async (who: PharmacyGrant) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

  const [dashboard, report, insights, alerts] = await Promise.all([
    who.supabase.rpc("pharmacy_dashboard"),
    who.supabase.rpc("pharmacy_report", { p_from: from, p_to: today }),
    who.supabase.rpc("pharmacy_insights"),
    who.supabase.rpc("pharmacy_stock_alerts"),
  ]);
  const failed = [dashboard, report, insights, alerts].find(answer => answer.error);
  if (failed?.error) return { error: failed.error };

  const forecast = ((insights.data as { forecast?: unknown[] } | null)?.forecast ?? []).slice(0, 40);
  const flags = (insights.data as { flags?: unknown[] } | null)?.flags ?? [];

  return {
    data: {
      as_of: today,
      today_and_month: dashboard.data,
      last_30_days_report: report.data,
      stock_forecast_top_40: forecast,
      things_worth_a_look: flags,
      stock_alerts: alerts.data,
    },
  };
};

const textOf = (content: { type: string; text?: string }[]) =>
  content.filter(block => block.type === "text").map(block => block.text ?? "").join("\n").trim();

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("The AI features are not set up on this server yet.", 503, { code: "ai_not_configured" });
  }

  const settings = await who.supabase
    .from("pharmacy_settings")
    .select("ai_assistant, ai_interactions, ai_interaction_level")
    .eq("tenant_id", who.auth.tenantId)
    .maybeSingle();
  if (settings.error) return fromRpc(settings.error);

  const client = new Anthropic();

  try {
    if (body.mode === "interactions") {
      if (settings.data && !settings.data.ai_interactions) return fail("The interaction checker is switched off.", 403, { code: "ai_feature_off" });

      const list = body.items.map((item, index) => `${index + 1}. ${item.name}${item.generic_name ? ` (generic: ${item.generic_name})` : ""}`).join("\n");
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: INTERACTION_SYSTEM,
        messages: [{ role: "user", content: `Medicines in this sale:\n${list}` }],
        output_config: { format: zodOutputFormat(interactionSchema) },
      });

      if (response.stop_reason === "refusal" || !response.parsed_output) {
        return fail("The checker could not answer for these medicines.", 502, { code: "ai_no_answer" });
      }

      // Only what is at or above the level this pharmacy asked to be interrupted for.
      const floor = LEVELS.indexOf((settings.data?.ai_interaction_level ?? "moderate") as (typeof LEVELS)[number]);
      const found = response.parsed_output.interactions;
      const shown = found.filter(entry => LEVELS.indexOf(entry.severity) >= floor);

      return json({ data: { interactions: shown, hidden: found.length - shown.length, summary: response.parsed_output.summary } });
    }

    if (settings.data && !settings.data.ai_assistant) return fail("The assistant is switched off.", 403, { code: "ai_feature_off" });

    // The assistant talks about takings and profit, which are for those given the reports.
    const allowed = await who.supabase.rpc("pharmacy_can", { p_perm: "see_reports" });
    if (allowed.error) return fromRpc(allowed.error);
    if (!allowed.data) return fail("You do not have permission to do this.", 403, { code: "no_permission" });

    const context = await snapshot(who);
    if ("error" in context && context.error) return fromRpc(context.error);

    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // A decline on one model is retried on another inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The instructions first and unchanging, the figures after: the part that repeats can be cached.
      system: [
        { type: "text", text: CHAT_SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `<pharmacy_data>\n${JSON.stringify(context.data)}\n</pharmacy_data>` },
      ],
      messages: body.messages,
    });

    if (response.stop_reason === "refusal") return fail("The assistant could not answer that.", 502, { code: "ai_no_answer" });

    return json({ data: { reply: textOf(response.content) } });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return fail("The AI key on this server was refused.", 503, { code: "ai_not_configured" });
    if (error instanceof Anthropic.RateLimitError) return fail("The assistant is busy. Try again in a moment.", 429, { code: "ai_busy" });
    if (error instanceof Anthropic.APIError) return fail("The assistant could not be reached.", 502, { code: "ai_unavailable" });
    throw error;
  }
};
