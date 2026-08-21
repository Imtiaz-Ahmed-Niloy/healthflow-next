import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/supabase/server";

/**
 * GET /api/v1/portal/medicines?q=... — search behind the Add Medicine
 * combobox on /portal/prescription (HF-58, re-approached).
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
      dosage_form: decodeEntities(titleMatch[1].trim()),
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
