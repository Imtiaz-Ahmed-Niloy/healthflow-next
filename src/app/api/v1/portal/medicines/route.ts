import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/portal/medicines?q=... — search behind the Add Medicine
 * combobox on /portal/prescription (HF-58, re-approached).
 *
 * ?recent=1 (no q) instead returns this doctor's own most-prescribed
 * medicines from `doctor_medicine_usage` (0029_doctor_medicine_usage.sql) --
 * the picker's default view before anything is typed. That used to be a
 * client-side localStorage cache (per-device, "recent" not "most used");
 * this is real prescribing history, so it follows the doctor across any
 * workstation. Everything below q's own handling is still the same live
 * MedEx proxy, untouched.
 *
 * POST records one use of a medicine -- called the moment a doctor adds it
 * to an Rx (Prescription.tsx's saveMedicine), not on final submit. Waiting
 * for "Print & Submit" meant "used it" never counted until the whole visit
 * was finished, and the picker's own most-used list wouldn't be caught up
 * for the next patient. A doctor editing an already-added Rx line doesn't
 * call this again -- only picking/adding counts as "used."
 *
 * A live proxy onto MedEx's own search-autocomplete endpoint
 * (medex.com.bd/ajax/search), not a local table. HealthFlow was verbally
 * given permission by MedEx to use this for the development phase (per
 * Ridwan, 2026-08-20) -- that permission does not obviously extend past
 * development, and this is an unofficial, undocumented endpoint with no
 * published contract, so:
 *
 *   - Nothing from MedEx is stored. Every search hits their live site;
 *     nothing is cached or copied into our own database. The earlier
 *     approach (0027_medicines.sql, a local seeded table) was reverted for
 *     exactly this reason -- storing/redistributing their data is a
 *     different, bigger ask than using their live search.
 *   - Sponsored/ad results are filtered out. Their search response can
 *     include a paid placement (class="lsri ad" / a "Sponsored" label) --
 *     that has no place surfacing inside a doctor's prescribing workflow,
 *     licensing question aside.
 *   - Only factual fields are read off the response (brand name, strength,
 *     dosage form), not MedEx's own written content (indications,
 *     pharmacology, etc.) -- that editorial text is never fetched here at
 *     all, deliberately.
 *   - This WILL break silently if MedEx changes their markup, since it's
 *     scraping HTML, not a stable contract. Revisit before relying on this
 *     past the development phase -- a real licensing conversation is the
 *     durable fix, this is the interim one.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');

// MedEx's own title attribute qualifies the form with a manufacturing detail
// no one prescribes by -- "Capsule (Enteric Coated)", "Tablet (Delayed
// Release)". A doctor writes "Capsule", full stop; the parenthetical is
// dropped rather than carried onto the Rx.
const stripParenthetical = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

type MedexHit = { brand_name: string; strength: string | null; dosage_form: string | null; icon_url: string | null };

/**
 * MedEx's search response is a repeating run of <a class="lsri">...</a>
 * blocks, not JSON. The <img> in each block is a generic dosage-form icon
 * (tablet.png, capsule.png, injection.png...) shared across every brand in
 * that form -- not a photo of the specific product. The search response
 * doesn't carry per-brand images, so that's the honest limit of what's
 * available here without fetching each brand's own detail page, which this
 * route deliberately doesn't do (see the file header).
 */
const parseMedexSearch = (html: string): MedexHit[] => {
  const chunks = html.split('<a href="').slice(1);
  const hits: MedexHit[] = [];

  for (const chunk of chunks) {
    if (chunk.includes('class="lsri ad"') || chunk.includes("search-ad-label")) continue; // sponsored, skip

    const titleMatch = chunk.match(/<li title="([^"]+)"/);
    const brandMatch = chunk.match(/<span>\s*([^<]+?)\s*(?:<span class="sr-strength">|<\/span>)/);
    if (!titleMatch || !brandMatch) continue;

    const strengthMatch = chunk.match(/<span class="sr-strength">([^<]*)<\/span>/);
    const imgMatch = chunk.match(/<img src="([^"]+)"/);

    hits.push({
      brand_name: decodeEntities(brandMatch[1].trim()),
      dosage_form: stripParenthetical(decodeEntities(titleMatch[1].trim())),
      strength: strengthMatch ? decodeEntities(strengthMatch[1].trim()) || null : null,
      icon_url: imgMatch ? decodeEntities(imgMatch[1]) : null,
    });
  }

  return hits;
};

export const GET = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can search the medicine list", 403);

  const url = new URL(request.url);

  if (url.searchParams.get("recent") === "1") {
    const supabase = await createServerSupabase();
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", auth.userId)
      .maybeSingle();
    if (doctorError) return fail(doctorError.message, 500);
    if (!doctor) return fail("No doctor profile is linked to this login.", 404);

    const { data, error } = await supabase
      .from("doctor_medicine_usage")
      .select("name, dosage_form, dose, use_count")
      .eq("doctor_id", doctor.id)
      .order("use_count", { ascending: false })
      .order("last_used_at", { ascending: false })
      .limit(15);
    if (error) return fail(error.message, 500);

    // Same MedexHit shape the client already renders -- icon_url isn't
    // tracked here (no per-brand image without fetching MedEx's own detail
    // page, see parseMedexSearch's comment). dose rides in the `strength`
    // slot on purpose: pickMedicine already does
    // `dose: f.dose || m.strength || ""`, so a saved pick prefills Dose the
    // exact same way a live search result does, with zero extra client code.
    // Napa 20mg and Napa 40mg are two separate rows here on purpose (see the
    // migration) -- each shows up, and picks, with its own real dose.
    return json({
      data: (data ?? []).map((m) => ({
        brand_name: m.name,
        dosage_form: m.dosage_form || null,
        strength: m.dose || null,
        icon_url: null,
      })),
    });
  }

  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return json({ data: [] });

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://medex.com.bd/ajax/search?searchtype=search&searchkey=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HealthFlowDev/1.0)" },
        signal: AbortSignal.timeout(5000),
      },
    );
  } catch {
    return fail("Couldn't reach the medicine search right now.", 502);
  }
  if (!upstream.ok) return fail("Couldn't reach the medicine search right now.", 502);

  const html = await upstream.text();
  const data = parseMedexSearch(html).slice(0, 20);

  return json({ data });
};

const recordUsageSchema = z.object({
  name: z.string().trim().min(1, "Which medicine?"),
  dosage_form: z.string().trim().optional().default(""),
  // Part of the identity now (0029_doctor_medicine_usage.sql) -- Napa 20mg
  // and Napa 40mg are tracked, and counted, as different medicines.
  dose: z.string().trim().optional().default(""),
});

export const POST = async (request: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (auth.role !== "doctor") return fail("Only a doctor can do this", 403);

  const body = await request.json().catch(() => null);
  const parsed = recordUsageSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 400);

  const supabase = await createServerSupabase();
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, tenant_id")
    .eq("profile_id", auth.userId)
    .maybeSingle();
  if (doctorError) return fail(doctorError.message, 500);
  if (!doctor) return fail("No doctor profile is linked to this login.", 404);

  const { error } = await supabase.rpc("record_medicine_usage", {
    p_tenant_id: doctor.tenant_id,
    p_doctor_id: doctor.id,
    p_medicines: [{ name: parsed.data.name, dosage_form: parsed.data.dosage_form, dose: parsed.data.dose }],
  });
  if (error) return fail(error.message, 500);

  return json({ data: { ok: true } });
};
